import { Injectable, ForbiddenException, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoSolicitud, EstadoRegistro } from '@prisma/client';
import { MercadoPagoService } from '../pagos/mercado-pago.service';
import { PreciosExamenService } from '../precios-examen/precios-examen.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { InscribirEventoDto } from './dto/inscribir-evento.dto';
import { REQUISITOS_EXAMEN } from './config/requisitos-examen';

const VALID_DISCIPLINAS = ['KENDO', 'IAIDO', 'JODO'];

const GRAD_EXAMEN_VALIDAS = ['KYU_3', 'KYU_2', 'KYU_1', 'DAN_1', 'DAN_2', 'DAN_3', 'DAN_4', 'DAN_5', 'DAN_6', 'DAN_7', 'DAN_8'];

const GraduacionRank: Record<string, number> = {
  SIN_GRADUACION: 0,
  KYU_3: 1,
  KYU_2: 2,
  KYU_1: 3,
  DAN_1: 4,
  DAN_2: 5,
  DAN_3: 6,
  DAN_4: 7,
  DAN_5: 8,
  DAN_6: 9,
  DAN_7: 10,
  DAN_8: 11,
};

function rankGrad(g: string): number {
  return GraduacionRank[g] ?? -1;
}

@Injectable()
export class EventosService {
  private readonly logger = new Logger(EventosService.name);

  constructor(
    private prisma: PrismaService,
    private mercadopagoService: MercadoPagoService,
    private preciosExamenService: PreciosExamenService,
  ) {}

  private get includeSub() {
    return {
      torneo: true,
      examen: true,
      seminario: true,
    } as const;
  }

  async create(dto: CreateEventoDto, user?: any) {
    const ambito = dto.ambito ?? 'REGIONAL';

    if (user?.rol === 'ADMIN_ASOCIACION') {
      if (dto.tipo === 'EXAMEN') {
        throw new ForbiddenException('Los administradores de asociación no pueden crear exámenes');
      }
      if (ambito !== 'REGIONAL') {
        throw new ForbiddenException('Los administradores de asociación solo pueden crear eventos regionales');
      }
    }

    this.validarDatosPorTipo(dto);

    const creadorId = user?.rol === 'ADMIN_ASOCIACION' ? user.sub : undefined;

    const evento = await this.prisma.evento.create({
      data: {
        tipo: dto.tipo,
        ambito,
        fecha_inicio: new Date(dto.fecha_inicio),
        fecha_fin: new Date(dto.fecha_fin),
        datos_lugar: dto.datos_lugar,
        publicado: false,
        pago_fuera_sistema: dto.pago_fuera_sistema ?? false,
        archivos_info: dto.archivos_info ?? undefined,
        creador_id: creadorId,
      },
    });

    await this.upsertSubRecord(evento.id, dto);

    return this.findOne(evento.id);
  }

  async findAll(incluirBorradores = false) {
    const where = incluirBorradores ? {} : { publicado: true };
    const eventos = await this.prisma.evento.findMany({
      where,
      include: this.includeSub,
      orderBy: { fecha_inicio: 'asc' },
    });
    return eventos.map(e => this.formatEvento(e));
  }

  async findOne(id: number) {
    const evento = await this.prisma.evento.findUnique({
      where: { id },
      include: this.includeSub,
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    return this.formatEvento(evento);
  }

  private async checkEventOwnership(eventoId: number, user: any) {
    if (user.rol === 'ADMIN_GENERAL') return;
    const evento = await this.prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (evento.creador_id !== user.sub) {
      throw new ForbiddenException('Usted no tiene permisos sobre este evento');
    }
  }

  async update(id: number, dto: UpdateEventoDto, user?: any) {
    const evento = await this.prisma.evento.findUnique({
      where: { id },
      include: this.includeSub,
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');

    await this.checkEventOwnership(id, user);

    const ambito = dto.ambito ?? evento.ambito;
    if (user?.rol === 'ADMIN_ASOCIACION') {
      if (dto.tipo === 'EXAMEN') {
        throw new ForbiddenException('Los administradores de asociación no pueden crear exámenes');
      }
      if (ambito !== 'REGIONAL') {
        throw new ForbiddenException('Los administradores de asociación solo pueden crear eventos regionales');
      }
    }

    const tipo = dto.tipo ?? evento.tipo;
    const mergedDto = { ...dto, tipo } as CreateEventoDto;
    this.validarDatosPorTipo(mergedDto);

    const data: any = {};
    if (dto.tipo !== undefined) data.tipo = dto.tipo;
    if (dto.ambito !== undefined) data.ambito = dto.ambito;
    if (dto.fecha_inicio !== undefined) data.fecha_inicio = new Date(dto.fecha_inicio);
    if (dto.fecha_fin !== undefined) data.fecha_fin = new Date(dto.fecha_fin);
    if (dto.datos_lugar !== undefined) data.datos_lugar = dto.datos_lugar;
    if (dto.pago_fuera_sistema !== undefined) data.pago_fuera_sistema = dto.pago_fuera_sistema;
    if (dto.archivos_info !== undefined) data.archivos_info = dto.archivos_info;

    await this.prisma.evento.update({ where: { id }, data });
    await this.upsertSubRecord(id, mergedDto);

    return this.findOne(id);
  }

  async publicar(id: number, user?: any) {
    const evento = await this.prisma.evento.findUnique({ where: { id } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    await this.checkEventOwnership(id, user);
    if (evento.publicado) throw new BadRequestException('El evento ya está publicado');

    const updated = await this.prisma.evento.update({
      where: { id },
      data: { publicado: true },
    });
    return this.findOne(updated.id);
  }

  async remove(id: number, user?: any) {
    const evento = await this.prisma.evento.findUnique({ where: { id } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    await this.checkEventOwnership(id, user);
    await this.prisma.evento.delete({ where: { id } });
    return { eliminado: true };
  }

  async inscribir(eventoId: number, usuarioId: number, dto?: InscribirEventoDto) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      include: this.includeSub,
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');

    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    if (usuario.estado_reg !== EstadoRegistro.APROBADO) {
      throw new ForbiddenException('Su cuenta debe estar aprobada para inscribirse a eventos');
    }
    if (!usuario.estado_pago) {
      throw new ForbiddenException('Debe tener la cuota federativa al día para inscribirse');
    }

    const now = new Date();

    if (evento.torneo && !evento.torneo.inscripciones_abiertas) {
      throw new BadRequestException('Las inscripciones para este evento están cerradas');
    }

    if (evento.torneo?.fecha_limite_real && new Date(evento.torneo.fecha_limite_real) < now) {
      throw new BadRequestException('La fecha límite de inscripción ya ha vencido');
    }

    if (new Date(evento.fecha_inicio) < now && evento.creador_id !== usuarioId) {
      throw new BadRequestException('El evento ya ha comenzado');
    }

    const existing = await this.prisma.inscripcionEvento.findFirst({
      where: { evento_id: eventoId, usuario_id: usuarioId },
    });
    if (existing) {
      throw new ConflictException('Ya se encuentra inscripto en este evento');
    }

    const categoriasArray = dto?.categorias?.length ? dto.categorias : [this.guessCategoria(evento.tipo, usuario)];

    const sub = evento.torneo ?? evento.examen ?? evento.seminario;
    this.validarCategorias(evento.tipo, sub, usuario, categoriasArray);

    if (evento.tipo === 'EXAMEN') {
      if (!dto?.disciplinas?.length) {
        throw new BadRequestException('Debe seleccionar al menos una disciplina para rendir');
      }
      this.validarRequisitosExamen(dto.disciplinas, categoriasArray, usuario);
    }

    const inscripcion = await this.prisma.inscripcionEvento.create({
      data: {
        usuario_id: usuarioId,
        evento_id: eventoId,
        categoria_grad: categoriasArray,
        disciplinas: evento.tipo === 'EXAMEN' ? dto?.disciplinas : undefined,
        estado_aprob: EstadoSolicitud.PENDIENTE,
        necesidades_especiales: dto?.necesidades_especiales ?? false,
        descripcion_necesidades: dto?.descripcion_necesidades ?? null,
        archivo_medico_url: dto?.archivo_medico_url ?? null,
      },
      include: { evento: true, usuario: true },
    });

    return this.formatInscripcion(inscripcion);
  }

  async findInscripciones(eventoId: number) {
    const evento = await this.prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) throw new NotFoundException('Evento no encontrado');

    const inscripciones = await this.prisma.inscripcionEvento.findMany({
      where: { evento_id: eventoId },
      include: { usuario: true, evento: true },
      orderBy: { id: 'asc' },
    });

    return inscripciones.map(i => this.formatInscripcion(i));
  }

  async findMisInscripciones(usuarioId: number) {
    const inscripciones = await this.prisma.inscripcionEvento.findMany({
      where: { usuario_id: usuarioId },
      include: { evento: true },
      orderBy: { id: 'desc' },
    });

    return inscripciones.map(i => this.formatInscripcion(i));
  }

  async aprobarInscripcion(inscripcionId: number, admin: any, accion: 'APROBAR' | 'RECHAZAR') {
    const inscripcion = await this.prisma.inscripcionEvento.findUnique({
      where: { id: inscripcionId },
      include: { usuario: true, evento: true },
    });

    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');

    if (admin.rol !== 'ADMIN_GENERAL') {
      const adminUser = await this.prisma.usuario.findUnique({ where: { id: admin.id } });
      if (!adminUser || adminUser.asociacion_id !== inscripcion.usuario.asociacion_id) {
        throw new ForbiddenException('Usted no tiene permisos para aprobar inscripciones de otra asociación');
      }
    }

    const nuevoEstado = accion === 'APROBAR' ? EstadoSolicitud.APROBADO : EstadoSolicitud.RECHAZADO;
    await this.prisma.inscripcionEvento.update({
      where: { id: inscripcionId },
      data: { estado_aprob: nuevoEstado },
    });

    return this.formatInscripcion({ ...inscripcion, estado_aprob: nuevoEstado });
  }

  async pagarInscripcion(inscripcionId: number, usuarioId: number) {
    const inscripcion = await this.prisma.inscripcionEvento.findUnique({
      where: { id: inscripcionId },
      include: {
        evento: { include: { torneo: true, examen: true, seminario: true } },
        usuario: true,
      },
    });

    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    if (inscripcion.usuario_id !== usuarioId) {
      throw new ForbiddenException('Esta inscripción no le pertenece');
    }
    if (inscripcion.pagado) {
      throw new ConflictException('Esta inscripción ya se encuentra pagada');
    }
    if (inscripcion.estado_aprob !== EstadoSolicitud.APROBADO) {
      throw new ForbiddenException('La inscripción debe estar aprobada por su administrador antes de pagar');
    }

    const costo = await this.calcularCostoInscripcion(inscripcion);

    if (costo === 0) {
      await this.prisma.inscripcionEvento.update({
        where: { id: inscripcionId },
        data: { pagado: true },
      });
      return { pagado: true, gratuito: true };
    }

    return this.mercadopagoService.createInscriptionPreference(
      usuarioId,
      inscripcion.usuario.email,
      costo,
      inscripcionId,
      inscripcion.evento_id,
    );
  }

  async editarInscripcion(inscripcionId: number, usuarioId: number, dto: InscribirEventoDto) {
    const inscripcion = await this.prisma.inscripcionEvento.findUnique({
      where: { id: inscripcionId },
      include: { evento: { include: { torneo: true } } },
    });

    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    if (inscripcion.usuario_id !== usuarioId) {
      throw new ForbiddenException('Esta inscripción no le pertenece');
    }

    if (inscripcion.evento.torneo?.fecha_limite_real && new Date(inscripcion.evento.torneo.fecha_limite_real) < new Date()) {
      throw new BadRequestException('La fecha límite para modificar la inscripción ya ha vencido');
    }

    if (!inscripcion.evento.torneo?.inscripciones_abiertas) {
      throw new BadRequestException('Las inscripciones están cerradas, no puede modificar');
    }

    const data: any = {};
    if (dto.categorias !== undefined) data.categoria_grad = dto.categorias;
    if (dto.disciplinas !== undefined) data.disciplinas = dto.disciplinas;
    if (dto.necesidades_especiales !== undefined) data.necesidades_especiales = dto.necesidades_especiales;
    if (dto.descripcion_necesidades !== undefined) data.descripcion_necesidades = dto.descripcion_necesidades;
    if (dto.archivo_medico_url !== undefined) data.archivo_medico_url = dto.archivo_medico_url;

    await this.prisma.inscripcionEvento.update({
      where: { id: inscripcionId },
      data,
    });

    return { modificado: true, mensaje: 'Si aplicaran devoluciones, comuníquese con el organizador del evento.' };
  }

  async bajaInscripcion(inscripcionId: number, usuarioId: number) {
    const inscripcion = await this.prisma.inscripcionEvento.findUnique({
      where: { id: inscripcionId },
      include: { evento: { include: { torneo: true } } },
    });

    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    if (inscripcion.usuario_id !== usuarioId) {
      throw new ForbiddenException('Esta inscripción no le pertenece');
    }

    if (inscripcion.evento.torneo?.fecha_limite_real && new Date(inscripcion.evento.torneo.fecha_limite_real) < new Date()) {
      throw new BadRequestException('La fecha límite para darse de baja ya ha vencido');
    }

    await this.prisma.inscripcionEvento.delete({ where: { id: inscripcionId } });

    return { eliminado: true, mensaje: 'Si aplicaran devoluciones, comuníquese con el organizador del evento.' };
  }

  async pagoManual(inscripcionId: number, user: any) {
    const inscripcion = await this.prisma.inscripcionEvento.findUnique({
      where: { id: inscripcionId },
      include: { evento: true },
    });

    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');

    if (user.rol === 'ADMIN_ASOCIACION') {
      if (inscripcion.evento.creador_id !== user.sub) {
        throw new ForbiddenException('Usted no tiene permisos para registrar pagos en este evento');
      }
    }

    if (!inscripcion.evento.pago_fuera_sistema) {
      throw new BadRequestException('Este evento no permite pagos fuera del sistema');
    }

    if (inscripcion.pagado || inscripcion.pagado_fuera_sistema) {
      throw new ConflictException('Esta inscripción ya se encuentra pagada');
    }

    if (inscripcion.estado_aprob !== EstadoSolicitud.APROBADO) {
      throw new ForbiddenException('La inscripción debe estar aprobada primero');
    }

    await this.prisma.inscripcionEvento.update({
      where: { id: inscripcionId },
      data: { pagado_fuera_sistema: true, pagado: true },
    });

    return { pagado: true, fuera_de_sistema: true };
  }

  async cerrarInscripciones(eventoId: number, user: any) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      include: { torneo: true },
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    await this.checkEventOwnership(eventoId, user);

    if (evento.tipo !== 'TORNEO') {
      throw new BadRequestException('Solo los torneos tienen inscripciones');
    }

    await this.prisma.torneo.update({
      where: { evento_id: eventoId },
      data: { inscripciones_abiertas: false },
    });

    return { inscripciones_abiertas: false };
  }

  private async upsertSubRecord(eventoId: number, dto: CreateEventoDto) {
    // Clean up sub-records of other types when tipo changes
    if (dto.tipo !== 'TORNEO') {
      await this.prisma.torneo.deleteMany({ where: { evento_id: eventoId } });
    }
    if (dto.tipo !== 'EXAMEN') {
      await this.prisma.examen.deleteMany({ where: { evento_id: eventoId } });
    }
    if (dto.tipo !== 'SEMINARIO') {
      await this.prisma.seminario.deleteMany({ where: { evento_id: eventoId } });
    }

    if (dto.tipo === 'TORNEO') {
      await this.prisma.torneo.upsert({
        where: { evento_id: eventoId },
        create: {
          evento_id: eventoId,
          disciplina: dto.disciplina ?? 'KENDO',
          costo_inscripcion: dto.costo_inscripcion ?? 0,
          categorias: (dto.categorias ?? []) as any,
          inscripcion_multiple: dto.inscripcion_multiple ?? false,
          grad_min: dto.grad_min ?? null,
          grad_max: dto.grad_max ?? null,
          info_adicional: dto.info_adicional ?? null,
          fecha_limite_informativa: dto.fecha_limite_informativa ? new Date(dto.fecha_limite_informativa) : null,
          fecha_limite_real: dto.fecha_limite_real ? new Date(dto.fecha_limite_real) : null,
          inscripciones_abiertas: dto.inscripciones_abiertas ?? true,
        },
        update: {
          disciplina: dto.disciplina ?? 'KENDO',
          costo_inscripcion: dto.costo_inscripcion ?? 0,
          categorias: (dto.categorias ?? []) as any,
          inscripcion_multiple: dto.inscripcion_multiple ?? false,
          grad_min: dto.grad_min ?? null,
          grad_max: dto.grad_max ?? null,
          info_adicional: dto.info_adicional ?? null,
          fecha_limite_informativa: dto.fecha_limite_informativa ? new Date(dto.fecha_limite_informativa) : null,
          fecha_limite_real: dto.fecha_limite_real ? new Date(dto.fecha_limite_real) : null,
          inscripciones_abiertas: dto.inscripciones_abiertas ?? true,
        },
      });
    } else if (dto.tipo === 'EXAMEN') {
      await this.prisma.examen.upsert({
        where: { evento_id: eventoId },
        create: {
          evento_id: eventoId,
          disciplinas: (dto.disciplinas ?? []) as any,
          graduaciones_a_rendir: (dto.graduaciones_a_rendir ?? []) as any,
          info_adicional: dto.info_adicional ?? null,
        },
        update: {
          disciplinas: (dto.disciplinas ?? []) as any,
          graduaciones_a_rendir: (dto.graduaciones_a_rendir ?? []) as any,
          info_adicional: dto.info_adicional ?? null,
        },
      });
    } else if (dto.tipo === 'SEMINARIO') {
      await this.prisma.seminario.upsert({
        where: { evento_id: eventoId },
        create: {
          evento_id: eventoId,
          disciplina: dto.disciplina ?? 'KENDO',
          costo_inscripcion: dto.costo_inscripcion ?? 0,
          info_adicional: dto.info_adicional ?? null,
        },
        update: {
          disciplina: dto.disciplina ?? 'KENDO',
          costo_inscripcion: dto.costo_inscripcion ?? 0,
          info_adicional: dto.info_adicional ?? null,
        },
      });
    }
  }

  private validarDatosPorTipo(dto: CreateEventoDto) {
    const tipo = dto.tipo;

    if (tipo === 'TORNEO') {
      return;
    }

    if (tipo === 'EXAMEN') {
      if (dto.inscripcion_multiple) {
        throw new BadRequestException('La inscripción múltiple no aplica para exámenes');
      }
      if (!dto.disciplinas || !Array.isArray(dto.disciplinas) || dto.disciplinas.length === 0) {
        throw new BadRequestException('Debe especificar al menos una disciplina para el examen');
      }
      for (const d of dto.disciplinas) {
        if (!VALID_DISCIPLINAS.includes(d)) {
          throw new BadRequestException(`Disciplina inválida: "${d}". Las opciones son: ${VALID_DISCIPLINAS.join(', ')}`);
        }
      }
      if (!dto.graduaciones_a_rendir || !Array.isArray(dto.graduaciones_a_rendir) || dto.graduaciones_a_rendir.length === 0) {
        throw new BadRequestException('Debe especificar al menos una graduación a rendir');
      }
      for (const g of dto.graduaciones_a_rendir) {
        if (!GRAD_EXAMEN_VALIDAS.includes(g)) {
          throw new BadRequestException(`Graduación inválida: "${g}". Las opciones son: ${GRAD_EXAMEN_VALIDAS.join(', ')}`);
        }
      }
      if (dto.costo_inscripcion !== undefined) {
        throw new BadRequestException('Los exámenes no tienen costo de inscripción fijo; utilice la tabla de precios por graduación');
      }
      if (dto.categorias) {
        throw new BadRequestException('Los exámenes no utilizan categorías');
      }
      if (dto.grad_min || dto.grad_max) {
        throw new BadRequestException('Los exámenes utilizan graduaciones a rendir en lugar de rango de graduación');
      }
      return;
    }

    if (tipo === 'SEMINARIO') {
      if (dto.inscripcion_multiple) {
        throw new BadRequestException('La inscripción múltiple no aplica para seminarios');
      }
      if (dto.categorias) {
        throw new BadRequestException('Los seminarios no utilizan categorías');
      }
      return;
    }
  }

  private async calcularCostoInscripcion(inscripcion: any): Promise<number> {
    if (inscripcion.evento.tipo === 'EXAMEN') {
      const categoriasArray = this.parseCategorias(inscripcion.categoria_grad);
      let total = 0;
      for (const grad of categoriasArray) {
        try {
          const precio = await this.preciosExamenService.findByGraduacion(grad);
          total += precio.costo;
        } catch {
          throw new BadRequestException(`No hay precio configurado para la graduación ${grad}`);
        }
      }
      return total;
    }

    return inscripcion.evento.torneo?.costo_inscripcion ?? inscripcion.evento.seminario?.costo_inscripcion ?? 0;
  }

  private validarRequisitosExamen(disciplinas: string[], graduaciones: string[], usuario: any) {
    const fechaNac = new Date(usuario.fecha_nacimiento);
    const edad = this.calcularEdad(fechaNac);

    for (const disco of disciplinas) {
      const gradKey = `grad_${disco.toLowerCase()}` as keyof typeof usuario;
      const fGradKey = `f_grad_${disco.toLowerCase()}` as keyof typeof usuario;
      const userGrad = usuario[gradKey] as string;

      for (const targetGrad of graduaciones) {
        const req = REQUISITOS_EXAMEN[targetGrad];
        if (!req) continue;

        if (req.edadMin !== undefined && edad < req.edadMin) {
          throw new ForbiddenException(
            `Para rendir ${targetGrad} se requiere edad mínima de ${req.edadMin} años`,
          );
        }

        if (req.graduacionPrevia) {
          if (userGrad !== req.graduacionPrevia) {
            throw new ForbiddenException(
              `Para rendir ${targetGrad} debe tener ${req.graduacionPrevia} aprobado en ${disco}`,
            );
          }

          const userFGrad = usuario[fGradKey] as Date | null;
          if (!userFGrad) {
            throw new ForbiddenException(
              `No tiene registro de fecha de obtención de ${userGrad} en ${disco}`,
            );
          }

          const fechaMinima = new Date(userFGrad);
          fechaMinima.setMonth(fechaMinima.getMonth() + req.mesesEspera);
          if (new Date() < fechaMinima) {
            const restan = this.diasEntre(new Date(), fechaMinima);
            throw new ForbiddenException(
              `Deben transcurrir al menos ${req.mesesEspera} meses desde la obtención de ${req.graduacionPrevia} en ${disco} para rendir ${targetGrad} (faltan ${restan} días)`,
            );
          }
        }
      }
    }
  }

  private validarCategorias(tipo: string, sub: any, usuario: any, categoriasArray: string[]) {
    if (tipo === 'EXAMEN') {
      for (const cat of categoriasArray) {
        if (!sub.graduaciones_a_rendir.includes(cat)) {
          throw new BadRequestException(`La graduación "${cat}" no está disponible en este examen`);
        }
      }
      return;
    }

    const disciplina = sub.disciplina;

    const catsDef = sub.categorias;
    if (catsDef && Array.isArray(catsDef)) {
      for (const catName of categoriasArray) {
        const cat = catsDef.find((c: any) => c.nombre === catName);
        if (!cat) {
          throw new BadRequestException(`La categoría "${catName}" no existe en este evento`);
        }
        this.validarCategoria(cat, usuario);
      }
      return;
    }

    if (disciplina && categoriasArray.length > 0) {
      const gradKey = `grad_${disciplina.toLowerCase()}` as keyof typeof usuario;
      const userGrad = usuario[gradKey] as string;
      const gradMin = sub.grad_min;
      const gradMax = sub.grad_max;

      if (gradMin && rankGrad(userGrad) < rankGrad(gradMin)) {
        throw new ForbiddenException(`Su graduación actual no cumple con el requisito mínimo (${gradMin})`);
      }
      if (gradMax && rankGrad(userGrad) > rankGrad(gradMax)) {
        throw new ForbiddenException(`Su graduación actual supera el máximo permitido (${gradMax})`);
      }
    }
  }

  private validarCategoria(cat: Record<string, any>, usuario: any) {
    if (cat.grad_min || cat.grad_max) {
      const disco = cat.disciplina || 'KENDO';
      const gradKey = `grad_${disco.toLowerCase()}` as keyof typeof usuario;
      const userGrad = usuario[gradKey] as string;

      if (cat.grad_min && rankGrad(userGrad) < rankGrad(cat.grad_min)) {
        throw new ForbiddenException(`La categoría "${cat.nombre}" requiere graduación mínima ${cat.grad_min}`);
      }
      if (cat.grad_max && rankGrad(userGrad) > rankGrad(cat.grad_max)) {
        throw new ForbiddenException(`La categoría "${cat.nombre}" requiere graduación máxima ${cat.grad_max}`);
      }
    }

    if (cat.genero) {
      const generoCat = cat.genero.toUpperCase();
      const sexoUser = usuario.sexo;

      if (sexoUser === 'X' && generoCat === 'FEMENINO') {
        throw new ForbiddenException(`La categoría "${cat.nombre}" es exclusiva para Femenino, y su sexo registral no lo permite`);
      }

      if (generoCat !== 'MIXTO' && sexoUser !== generoCat && sexoUser !== 'X') {
        throw new ForbiddenException(`La categoría "${cat.nombre}" es exclusiva para ${cat.genero}`);
      }
    }

    if (cat.edad_min !== undefined) {
      const fechaNac = new Date(usuario.fecha_nacimiento);
      const edad = this.calcularEdad(fechaNac);
      if (edad < cat.edad_min) {
        throw new ForbiddenException(`La categoría "${cat.nombre}" requiere edad mínima de ${cat.edad_min} años`);
      }
    }

    if (cat.edad_max !== undefined) {
      const fechaNac = new Date(usuario.fecha_nacimiento);
      const edad = this.calcularEdad(fechaNac);
      if (edad > cat.edad_max) {
        throw new ForbiddenException(`La categoría "${cat.nombre}" es para menores de ${cat.edad_max} años`);
      }
    }
  }

  private guessCategoria(tipo: string, usuario: any): string {
    if (tipo === 'EXAMEN') {
      return `Examen ${usuario.grad_kendo || 'SIN_GRADUACION'}`;
    }
    return 'General';
  }

  private parseCategorias(raw: any): string[] {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return [raw];
    return [];
  }

  private calcularEdad(fechaNac: Date): number {
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }
    return edad;
  }

  private diasEntre(a: Date, b: Date): number {
    const diff = b.getTime() - a.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private formatEvento(evento: any) {
    return {
      id: evento.id,
      tipo: evento.tipo,
      ambito: evento.ambito,
      fecha_inicio: evento.fecha_inicio,
      fecha_fin: evento.fecha_fin,
      datos_lugar: evento.datos_lugar,
      publicado: evento.publicado,
      pago_fuera_sistema: evento.pago_fuera_sistema,
      archivos_info: evento.archivos_info,
      creador_id: evento.creador_id,
      ...(evento.tipo === 'TORNEO' && evento.torneo ? { torneo: evento.torneo } : {}),
      ...(evento.tipo === 'EXAMEN' && evento.examen ? { examen: evento.examen } : {}),
      ...(evento.tipo === 'SEMINARIO' && evento.seminario ? { seminario: evento.seminario } : {}),
    };
  }

  private formatInscripcion(inscripcion: any) {
    return {
      id: inscripcion.id,
      usuario_id: inscripcion.usuario_id,
      evento_id: inscripcion.evento_id,
      categorias: this.parseCategorias(inscripcion.categoria_grad),
      disciplinas: inscripcion.disciplinas ? this.parseCategorias(inscripcion.disciplinas) : undefined,
      estado_aprob: inscripcion.estado_aprob,
      pagado: inscripcion.pagado,
      pagado_fuera_sistema: inscripcion.pagado_fuera_sistema,
      necesidades_especiales: inscripcion.necesidades_especiales,
      descripcion_necesidades: inscripcion.descripcion_necesidades,
      archivo_medico_url: inscripcion.archivo_medico_url,
      usuario: inscripcion.usuario ? {
        id: inscripcion.usuario.id,
        nombre: `${inscripcion.usuario.nombre} ${inscripcion.usuario.apellido}`,
        email: inscripcion.usuario.email,
        dni: inscripcion.usuario.dni,
        asociacion_id: inscripcion.usuario.asociacion_id,
      } : undefined,
      evento: inscripcion.evento ? {
        id: inscripcion.evento.id,
        tipo: inscripcion.evento.tipo,
        fecha_inicio: inscripcion.evento.fecha_inicio,
        fecha_fin: inscripcion.evento.fecha_fin,
      } : undefined,
    };
  }
}
