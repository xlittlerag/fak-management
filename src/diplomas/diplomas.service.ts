import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Disciplina, Graduacion, Prisma } from '@prisma/client';
import { MercadoPagoService } from '../pagos/mercado-pago.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateDiplomaDto } from './dto/create-diploma.dto';
import { ReimprimirDto } from './dto/reimprimir.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { FilesService } from '../files/files.service';
import { instanciasRequeridas } from '../eventos/config/instancias-examen';

@Injectable()
export class DiplomasService {
  constructor(
    private prisma: PrismaService,
    private mercadopagoService: MercadoPagoService,
    private filesService: FilesService,
  ) {}

  async create(file: Express.Multer.File, dto: CreateDiplomaDto) {
    let graduacion = dto.graduacion;
    let inscripcionId: number | null = null;
    let esExamen = false;

    if (dto.inscripcion_id) {
      const inscripcion = await this.prisma.inscripcionEvento.findUnique({
        where: { id: dto.inscripcion_id },
        include: { evento: true },
      });
      if (!inscripcion)
        throw new NotFoundException('Inscripción no encontrada');
      if (inscripcion.estado_aprob !== 'APROBADO') {
        throw new BadRequestException('La inscripción no está aprobada');
      }
      const categorias = inscripcion.categoria_grad as Record<string, string>;
      const gradKey = dto.disciplina;
      if (categorias && categorias[gradKey]) {
        graduacion = categorias[gradKey];
      } else if (!graduacion) {
        throw new BadRequestException(
          'No se pudo determinar la graduación del diploma',
        );
      }

      const existing = await this.prisma.diplomaNacional.findUnique({
        where: {
          inscripcion_id_disciplina: {
            inscripcion_id: dto.inscripcion_id,
            disciplina: dto.disciplina as Disciplina,
          },
        },
      });
      if (existing)
        throw new ConflictException(
          'Ya existe un diploma para esta inscripción y disciplina',
        );

      inscripcionId = inscripcion.id;
      esExamen = inscripcion.evento.tipo === 'EXAMEN';
      await this.validarEvidenciaExamen(
        dto.inscripcion_id,
        dto.disciplina,
        graduacion,
      );
    }

    if (!graduacion)
      throw new BadRequestException('La graduación es requerida');

    const url_archivo = await this.filesService.upload(file);

    return this.prisma.$transaction(async (tx) => {
      const diploma = await tx.diplomaNacional.create({
        data: {
          usuario_id: dto.usuario_id,
          url_archivo,
          disciplina: dto.disciplina as Disciplina,
          graduacion: graduacion as Graduacion,
          inscripcion_id: dto.inscripcion_id ?? null,
        },
        include: {
          usuario: {
            select: { id: true, nombre: true, apellido: true, dni: true },
          },
        },
      });

      if (esExamen && inscripcionId) {
        await this.aplicarGraduacionPorDiploma(
          tx,
          inscripcionId,
          dto.disciplina,
          graduacion,
          diploma.id,
        );
      }

      return diploma;
    });
  }

  async createLote(
    evento_id: number,
    files: Express.Multer.File[],
    archivosMeta: string,
  ) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: evento_id },
      include: {
        inscripciones: {
          where: { estado_aprob: 'APROBADO' },
        },
      },
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');

    const metas = JSON.parse(archivosMeta) as {
      usuario_id: number;
      disciplina: string;
    }[];
    if (files.length !== metas.length) {
      throw new BadRequestException(
        'La cantidad de archivos no coincide con los metadatos',
      );
    }

    const errors: string[] = [];
    const created: any[] = [];

    for (let i = 0; i < metas.length; i++) {
      const meta = metas[i];
      const file = files[i];
      const inscripcion = evento.inscripciones.find(
        (ins) => ins.usuario_id === meta.usuario_id,
      );
      if (!inscripcion) {
        errors.push(
          `Usuario ${meta.usuario_id}: no tiene inscripción aprobada en este evento`,
        );
        continue;
      }
      const categorias = inscripcion.categoria_grad as Record<string, string>;
      const graduacion = categorias?.[meta.disciplina];
      if (!graduacion) {
        errors.push(
          `Usuario ${meta.usuario_id}: no se encontró graduación para ${meta.disciplina}`,
        );
        continue;
      }
      try {
        const url_archivo = await this.filesService.upload(file);
        const diploma = await this.prisma.$transaction(async (tx) => {
          const created = await tx.diplomaNacional.create({
            data: {
              usuario_id: meta.usuario_id,
              url_archivo,
              disciplina: meta.disciplina as Disciplina,
              graduacion: graduacion as Graduacion,
              inscripcion_id: inscripcion.id,
            },
          });

          if (evento.tipo === 'EXAMEN') {
            const requeridas = instanciasRequeridas(
              meta.disciplina,
              graduacion,
            );
            if (requeridas.length === 0) {
              throw new BadRequestException(
                'No se puede otorgar esta graduación mediante un diploma de examen',
              );
            }
            const [resultados, registro] = await Promise.all([
              tx.resultadoExamen.findMany({
                where: {
                  inscripcion_id: inscripcion.id,
                  disciplina: meta.disciplina,
                },
              }),
              tx.registroExamen.findUnique({
                where: {
                  inscripcion_id_disciplina: {
                    inscripcion_id: inscripcion.id,
                    disciplina: meta.disciplina,
                  },
                },
              }),
            ]);
            const completas = requeridas.every((inst) =>
              resultados.some((r) => r.instancia === inst && r.aprobado),
            );
            if (!completas || !registro?.pagado) {
              throw new BadRequestException(
                'El candidato no tiene aprobadas todas las instancias del examen ni el pago registrado para esta disciplina',
              );
            }
            await this.aplicarGraduacionPorDiploma(
              tx,
              inscripcion.id,
              meta.disciplina,
              graduacion,
              created.id,
            );
          }

          return created;
        });
        created.push(diploma);
      } catch (e) {
        const prismaError = e as { code?: string; message?: string };
        if (prismaError.code === 'P2002') {
          errors.push(
            `Usuario ${meta.usuario_id} - ${meta.disciplina}: ya existe un diploma`,
          );
        } else {
          errors.push(
            `Usuario ${meta.usuario_id} - ${meta.disciplina}: ${prismaError.message}`,
          );
        }
      }
    }

    return { created: created.length, errors };
  }

  async findAll(usuario_id?: number) {
    const where: Prisma.DiplomaNacionalWhereInput = {};
    if (usuario_id) where.usuario_id = usuario_id;
    return this.prisma.diplomaNacional.findMany({
      where,
      include: {
        usuario: {
          select: { id: true, nombre: true, apellido: true, dni: true },
        },
        inscripcion: {
          select: { id: true, evento_id: true, estado_aprob: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findMisDiplomas(userId: number) {
    return this.prisma.diplomaNacional.findMany({
      where: { usuario_id: userId },
      select: {
        id: true,
        disciplina: true,
        graduacion: true,
        url_archivo: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  private async validarEvidenciaExamen(
    inscripcionId: number,
    disciplina: string,
    graduacion: string,
  ) {
    const inscripcion = await this.prisma.inscripcionEvento.findUnique({
      where: { id: inscripcionId },
      include: { evento: true },
    });
    if (!inscripcion) return;
    if (inscripcion.evento.tipo !== 'EXAMEN') return;

    const instancias = instanciasRequeridas(disciplina, graduacion);
    if (instancias.length === 0) {
      throw new BadRequestException(
        'No se puede otorgar esta graduación mediante un diploma de examen',
      );
    }

    const [resultados, registro] = await Promise.all([
      this.prisma.resultadoExamen.findMany({
        where: { inscripcion_id: inscripcionId, disciplina },
      }),
      this.prisma.registroExamen.findUnique({
        where: {
          inscripcion_id_disciplina: {
            inscripcion_id: inscripcionId,
            disciplina,
          },
        },
      }),
    ]);

    const completas = instancias.every((inst) =>
      resultados.some((r) => r.instancia === inst && r.aprobado),
    );

    if (!completas || !registro?.pagado) {
      throw new BadRequestException(
        'El candidato no tiene aprobadas todas las instancias del examen ni el pago registrado para esta disciplina',
      );
    }
  }

  private async aplicarGraduacionPorDiploma(
    tx: Prisma.TransactionClient,
    inscripcionId: number,
    disciplina: string,
    graduacion: string,
    diplomaId: number,
  ) {
    const inscripcion = await tx.inscripcionEvento.findUnique({
      where: { id: inscripcionId },
    });
    if (!inscripcion) return;

    const gradKey = `grad_${disciplina.toLowerCase()}` as
      'grad_kendo' | 'grad_iaido' | 'grad_jodo';
    const fGradKey = `f_grad_${disciplina.toLowerCase()}` as
      'f_grad_kendo' | 'f_grad_iaido' | 'f_grad_jodo';

    await tx.usuario.update({
      where: { id: inscripcion.usuario_id },
      data: { [gradKey]: graduacion as Graduacion, [fGradKey]: new Date() },
    });

    await tx.historialGraduacion.create({
      data: {
        usuario_id: inscripcion.usuario_id,
        disciplina: disciplina as Disciplina,
        graduacion: graduacion as Graduacion,
        fecha_obtencion: new Date(),
        otorgado_por: `Diploma nacional #${diplomaId}`,
      },
    });

    await tx.registroExamen.update({
      where: {
        inscripcion_id_disciplina: {
          inscripcion_id: inscripcionId,
          disciplina,
        },
      },
      data: { graduacion_aplicada: true },
    });
  }

  async getConfig() {
    let config = await this.prisma.configSistema.findFirst();
    if (!config) {
      config = await this.prisma.configSistema.create({
        data: { precio_reimpresion: 5000 },
      });
    }
    return { precio_reimpresion: config.precio_reimpresion };
  }

  async updateConfig(dto: UpdateConfigDto) {
    let config = await this.prisma.configSistema.findFirst();
    if (!config) {
      config = await this.prisma.configSistema.create({
        data: { precio_reimpresion: dto.precio_reimpresion },
      });
    } else {
      config = await this.prisma.configSistema.update({
        where: { id: config.id },
        data: { precio_reimpresion: dto.precio_reimpresion },
      });
    }
    return { precio_reimpresion: config.precio_reimpresion };
  }

  async reimprimir(dto: ReimprimirDto, user: AuthUser) {
    const diploma = await this.prisma.diplomaNacional.findFirst({
      where: {
        usuario_id: user.id,
        disciplina: dto.disciplina as Disciplina,
      },
      orderBy: { created_at: 'desc' },
    });
    if (!diploma)
      throw new NotFoundException(
        'No se encontró un diploma nacional de esa disciplina',
      );

    const config = await this.getConfig();

    const reimpresion = await this.prisma.reimpresionDiploma.create({
      data: {
        usuario_id: user.id,
        diploma_id: diploma.id,
        pagado: false,
      },
    });

    const userData = await this.prisma.usuario.findUnique({
      where: { id: user.id },
    });
    if (!userData) throw new NotFoundException('Usuario no encontrado');

    const preference =
      await this.mercadopagoService.createReimpresionPreference(
        user.id,
        userData.email,
        config.precio_reimpresion,
        reimpresion.id,
      );

    return { reimpresion_id: reimpresion.id, preference };
  }

  async findReimpresiones() {
    return this.prisma.reimpresionDiploma.findMany({
      include: {
        usuario: {
          select: { id: true, nombre: true, apellido: true, dni: true },
        },
        diploma: {
          select: {
            id: true,
            disciplina: true,
            graduacion: true,
            url_archivo: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
