import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from '../pagos/mercado-pago.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateDiplomaDto } from './dto/create-diploma.dto';
import { CreateDiplomaLoteDto } from './dto/create-diploma.dto';
import { ReimprimirDto } from './dto/reimprimir.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class DiplomasService {
  constructor(
    private prisma: PrismaService,
    private mercadopagoService: MercadoPagoService,
  ) {}

  async create(dto: CreateDiplomaDto) {
    let graduacion = dto.graduacion;

    if (dto.inscripcion_id) {
      const inscripcion = await this.prisma.inscripcionEvento.findUnique({
        where: { id: dto.inscripcion_id },
      });
      if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
      if (inscripcion.estado_aprob !== 'APROBADO') {
        throw new BadRequestException('La inscripción no está aprobada');
      }
      const categorias = inscripcion.categoria_grad as Record<string, string>;
      const gradKey = dto.disciplina;
      if (categorias && categorias[gradKey]) {
        graduacion = categorias[gradKey];
      } else if (!graduacion) {
        throw new BadRequestException('No se pudo determinar la graduación del diploma');
      }

      const existing = await this.prisma.diplomaNacional.findUnique({
        where: { inscripcion_id_disciplina: { inscripcion_id: dto.inscripcion_id, disciplina: dto.disciplina as any } },
      });
      if (existing) throw new ConflictException('Ya existe un diploma para esta inscripción y disciplina');
    }

    if (!graduacion) throw new BadRequestException('La graduación es requerida');

    return this.prisma.diplomaNacional.create({
      data: {
        usuario_id: dto.usuario_id,
        url_archivo: dto.url_archivo,
        disciplina: dto.disciplina as any,
        graduacion: graduacion as any,
        inscripcion_id: dto.inscripcion_id ?? null,
      },
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, dni: true } },
      },
    });
  }

  async createLote(dto: CreateDiplomaLoteDto, archivos: { usuario_id: number; disciplina: string; url_archivo: string }[]) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: dto.evento_id },
      include: {
        inscripciones: {
          where: { estado_aprob: 'APROBADO' },
        },
      },
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');

    const errors: string[] = [];
    const created: any[] = [];

    for (const archivo of archivos) {
      const inscripcion = evento.inscripciones.find(
        (i) => i.usuario_id === archivo.usuario_id,
      );
      if (!inscripcion) {
        errors.push(`Usuario ${archivo.usuario_id}: no tiene inscripción aprobada en este evento`);
        continue;
      }
      const categorias = inscripcion.categoria_grad as Record<string, string>;
      const graduacion = categorias?.[archivo.disciplina];
      if (!graduacion) {
        errors.push(`Usuario ${archivo.usuario_id}: no se encontró graduación para ${archivo.disciplina}`);
        continue;
      }
      try {
        const diploma = await this.prisma.diplomaNacional.create({
          data: {
            usuario_id: archivo.usuario_id,
            url_archivo: archivo.url_archivo,
            disciplina: archivo.disciplina as any,
            graduacion: graduacion as any,
            inscripcion_id: inscripcion.id,
          },
        });
        created.push(diploma);
      } catch (e: any) {
        if (e.code === 'P2002') {
          errors.push(`Usuario ${archivo.usuario_id} - ${archivo.disciplina}: ya existe un diploma`);
        } else {
          errors.push(`Usuario ${archivo.usuario_id} - ${archivo.disciplina}: ${e.message}`);
        }
      }
    }

    return { created: created.length, errors };
  }

  async findAll(usuario_id?: number) {
    const where: any = {};
    if (usuario_id) where.usuario_id = usuario_id;
    return this.prisma.diplomaNacional.findMany({
      where,
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, dni: true } },
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
        disciplina: dto.disciplina as any,
      },
      orderBy: { created_at: 'desc' },
    });
    if (!diploma) throw new NotFoundException('No se encontró un diploma nacional de esa disciplina');

    const config = await this.getConfig();

    const reimpresion = await this.prisma.reimpresionDiploma.create({
      data: {
        usuario_id: user.id,
        diploma_id: diploma.id,
        pagado: false,
      },
    });

    const userData = await this.prisma.usuario.findUnique({ where: { id: user.id } });
    if (!userData) throw new NotFoundException('Usuario no encontrado');

    const preference = await this.mercadopagoService.createReimpresionPreference(
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
        usuario: { select: { id: true, nombre: true, apellido: true, dni: true } },
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
