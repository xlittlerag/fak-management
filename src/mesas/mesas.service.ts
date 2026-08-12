import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateMesaDto } from './dto/create-mesa.dto';
import { UpdateMesaDto } from './dto/update-mesa.dto';
import { CargarResultadoDto } from './dto/cargar-resultado.dto';
import { CargarAvanceDto } from './dto/cargar-avance.dto';
import { instanciasRequeridas } from '../eventos/config/instancias-examen';

const VALID_DISCIPLINAS = ['KENDO', 'IAIDO', 'JODO'];

const GRAD_EXAMEN_VALIDAS = [
  'KYU_3',
  'KYU_2',
  'KYU_1',
  'DAN_1',
  'DAN_2',
  'DAN_3',
  'DAN_4',
  'DAN_5',
  'DAN_6',
  'DAN_7',
  'DAN_8',
];

const GRADUACION_RANK: Record<string, number> = {
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
  return GRADUACION_RANK[g] ?? -1;
}

@Injectable()
export class MesasService {
  constructor(private readonly prisma: PrismaService) {}

  async createMesa(eventoId: number, dto: CreateMesaDto, user: AuthUser) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      include: { examen: true },
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (evento.tipo !== 'EXAMEN') {
      throw new BadRequestException(
        'Las mesas examinadoras solo se crean para exámenes',
      );
    }

    this.validarDisciplina(dto.disciplina);
    this.validarRango(dto.grad_min, dto.grad_max);
    this.validarRangoDelExamen(
      evento,
      dto.disciplina,
      dto.grad_min,
      dto.grad_max,
    );

    const mesa = await this.prisma.mesaExaminadora.create({
      data: {
        evento_id: eventoId,
        disciplina: dto.disciplina,
        examinadores: dto.examinadores,
        grad_min: dto.grad_min,
        grad_max: dto.grad_max,
        creador_id: user.id,
      },
    });
    return this.formatMesa(mesa);
  }

  async findMesas(eventoId: number) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');

    const mesas = await this.prisma.mesaExaminadora.findMany({
      where: { evento_id: eventoId },
      orderBy: { id: 'asc' },
    });
    return mesas.map((m) => this.formatMesa(m));
  }

  async updateMesa(id: number, dto: UpdateMesaDto, user: AuthUser) {
    const mesa = await this.prisma.mesaExaminadora.findUnique({
      where: { id },
      include: { evento: { include: { examen: true } } },
    });
    if (!mesa) throw new NotFoundException('Mesa no encontrada');

    const nextGradMin = dto.grad_min ?? mesa.grad_min;
    const nextGradMax = dto.grad_max ?? mesa.grad_max;

    this.validarRango(nextGradMin, nextGradMax);
    this.validarRangoDelExamen(
      mesa.evento,
      mesa.disciplina,
      nextGradMin,
      nextGradMax,
    );

    const updated = await this.prisma.mesaExaminadora.update({
      where: { id },
      data: {
        ...(dto.examinadores ? { examinadores: dto.examinadores } : {}),
        ...(dto.grad_min ? { grad_min: dto.grad_min } : {}),
        ...(dto.grad_max ? { grad_max: dto.grad_max } : {}),
        ...(dto.examinadores || dto.grad_min || dto.grad_max
          ? { creador_id: user.id }
          : {}),
      },
    });
    return this.formatMesa(updated);
  }

  async deleteMesa(id: number) {
    const mesa = await this.prisma.mesaExaminadora.findUnique({
      where: { id },
    });
    if (!mesa) throw new NotFoundException('Mesa no encontrada');

    const resultados = await this.prisma.resultadoExamen.count({
      where: { mesa_id: id },
    });
    if (resultados > 0) {
      throw new ConflictException(
        'No se puede eliminar la mesa porque tiene resultados cargados',
      );
    }

    await this.prisma.mesaExaminadora.delete({ where: { id } });
    return { message: 'Mesa eliminada correctamente' };
  }

  async findResultados(eventoId: number) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      include: { examen: true },
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (evento.tipo !== 'EXAMEN') {
      throw new BadRequestException(
        'Los resultados solo se consultan para exámenes',
      );
    }

    const inscripciones = await this.prisma.inscripcionEvento.findMany({
      where: { evento_id: eventoId, estado_aprob: 'APROBADO' },
      include: { usuario: true },
      orderBy: { id: 'asc' },
    });

    if (inscripciones.length === 0) return [];

    const inscripcionIds = inscripciones.map((i) => i.id);

    const [resultados, registros] = await Promise.all([
      this.prisma.resultadoExamen.findMany({
        where: { inscripcion_id: { in: inscripcionIds } },
      }),
      this.prisma.registroExamen.findMany({
        where: { inscripcion_id: { in: inscripcionIds } },
      }),
    ]);

    return inscripciones.map((insc) => {
      const disciplinas = this.parseArray(insc.disciplinas);
      const targets = this.parseArray(insc.categoria_grad);

      const instancias: Array<{
        disciplina: string;
        graduacion: string;
        instancia: string;
        aprobado: boolean | null;
        mesa_id: number | null;
        registro_pagado: boolean;
        graduacion_aplicada: boolean;
      }> = [];

      for (let i = 0; i < disciplinas.length; i++) {
        const disciplina = disciplinas[i];
        const graduacion = targets[i];
        if (!graduacion) continue;

        const requeridas = instanciasRequeridas(disciplina, graduacion);
        const registro = registros.find(
          (r) => r.inscripcion_id === insc.id && r.disciplina === disciplina,
        );

        for (const instancia of requeridas) {
          const resultado = resultados.find(
            (r) =>
              r.inscripcion_id === insc.id &&
              r.disciplina === disciplina &&
              r.instancia === instancia,
          );
          instancias.push({
            disciplina,
            graduacion,
            instancia,
            aprobado: resultado?.aprobado ?? null,
            mesa_id: resultado?.mesa_id ?? null,
            registro_pagado: registro?.pagado ?? false,
            graduacion_aplicada: registro?.graduacion_aplicada ?? false,
          });
        }
      }

      return {
        inscripcion_id: insc.id,
        usuario: {
          id: insc.usuario.id,
          nombre: `${insc.usuario.nombre} ${insc.usuario.apellido}`,
          email: insc.usuario.email,
          dni: insc.usuario.dni,
        },
        instancias,
      };
    });
  }

  async cargarResultado(dto: CargarResultadoDto, user: AuthUser) {
    const { inscripcion_id, disciplina, instancia, aprobado, mesa_id } = dto;

    const inscripcion = await this.prisma.inscripcionEvento.findUnique({
      where: { id: inscripcion_id },
      include: { evento: { include: { examen: true } } },
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    if (inscripcion.evento.tipo !== 'EXAMEN') {
      throw new BadRequestException(
        'Los resultados solo se cargan para exámenes',
      );
    }
    if (inscripcion.estado_aprob !== 'APROBADO') {
      throw new BadRequestException(
        'La inscripción debe estar aprobada para cargar resultados',
      );
    }

    const disciplinas = this.parseArray(inscripcion.disciplinas);
    const targets = this.parseArray(inscripcion.categoria_grad);
    const idx = disciplinas.indexOf(disciplina);
    if (idx === -1) {
      throw new BadRequestException(
        'La disciplina no corresponde a la inscripción',
      );
    }
    const graduacion = targets[idx];
    if (!graduacion) {
      throw new BadRequestException(
        'No se pudo determinar la graduación a rendir',
      );
    }

    const instanciasValidas = instanciasRequeridas(disciplina, graduacion);
    if (!instanciasValidas.includes(instancia)) {
      throw new BadRequestException(
        'La instancia no corresponde a esta disciplina y graduación',
      );
    }

    const idxInstancia = instanciasValidas.indexOf(instancia);
    if (idxInstancia > 0) {
      const anteriores = instanciasValidas.slice(0, idxInstancia);
      const resultadosPrevios = await this.prisma.resultadoExamen.findMany({
        where: { inscripcion_id, disciplina, instancia: { in: anteriores } },
      });
      for (const anterior of anteriores) {
        const previo = resultadosPrevios.find((r) => r.instancia === anterior);
        if (!previo || !previo.aprobado) {
          throw new BadRequestException(
            `Debe aprobar ${this.labelInstancia(anterior)} antes de poder cargar ${this.labelInstancia(instancia)}`,
          );
        }
      }
    }

    const registroExistente = await this.prisma.registroExamen.findUnique({
      where: {
        inscripcion_id_disciplina: { inscripcion_id, disciplina },
      },
    });
    if (registroExistente?.graduacion_aplicada) {
      throw new BadRequestException(
        'La graduación ya fue otorgada mediante el diploma; no se pueden modificar los resultados',
      );
    }

    const mesaAsignadaId = await this.asignarMesa(
      inscripcion.evento_id,
      disciplina,
      graduacion,
      mesa_id,
    );

    const resultado = await this.prisma.resultadoExamen.upsert({
      where: {
        inscripcion_id_disciplina_instancia: {
          inscripcion_id,
          disciplina,
          instancia,
        },
      },
      create: {
        inscripcion_id,
        disciplina,
        instancia,
        mesa_id: mesaAsignadaId,
        aprobado,
        cargado_por: user.id,
      },
      update: {
        mesa_id: mesaAsignadaId,
        aprobado,
        cargado_por: user.id,
      },
    });
    return this.formatResultado(resultado);
  }

  async cargarAvance(dto: CargarAvanceDto, user: AuthUser) {
    const { inscripcion_id, disciplina, aprobada_hasta, desaprobada, mesa_id } =
      dto;

    const inscripcion = await this.prisma.inscripcionEvento.findUnique({
      where: { id: inscripcion_id },
      include: { evento: { include: { examen: true } } },
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    if (inscripcion.evento.tipo !== 'EXAMEN') {
      throw new BadRequestException(
        'Los resultados solo se cargan para exámenes',
      );
    }
    if (inscripcion.estado_aprob !== 'APROBADO') {
      throw new BadRequestException(
        'La inscripción debe estar aprobada para cargar resultados',
      );
    }

    const disciplinas = this.parseArray(inscripcion.disciplinas);
    const targets = this.parseArray(inscripcion.categoria_grad);
    const idx = disciplinas.indexOf(disciplina);
    if (idx === -1) {
      throw new BadRequestException(
        'La disciplina no corresponde a la inscripción',
      );
    }
    const graduacion = targets[idx];
    if (!graduacion) {
      throw new BadRequestException(
        'No se pudo determinar la graduación a rendir',
      );
    }

    const instancias = instanciasRequeridas(disciplina, graduacion);
    if (instancias.length === 0) {
      throw new BadRequestException(
        'No se pueden cargar resultados para esta disciplina y graduación',
      );
    }

    const idxHasta = aprobada_hasta ? instancias.indexOf(aprobada_hasta) : -1;
    const idxDesaprobada = desaprobada ? instancias.indexOf(desaprobada) : -1;
    if (aprobada_hasta && idxHasta === -1) {
      throw new BadRequestException(
        'La instancia aprobada no corresponde a esta disciplina y graduación',
      );
    }
    if (desaprobada && idxDesaprobada === -1) {
      throw new BadRequestException(
        'La instancia desaprobada no corresponde a esta disciplina y graduación',
      );
    }
    if (desaprobada && idxDesaprobada !== (aprobada_hasta ? idxHasta + 1 : 0)) {
      throw new BadRequestException(
        'No se puede desaprobar una instancia sin tener aprobadas las anteriores',
      );
    }

    const prefixLen = aprobada_hasta ? idxHasta + 1 : 0;
    const clearStart = desaprobada ? idxDesaprobada + 1 : prefixLen;

    const registro = await this.prisma.registroExamen.findUnique({
      where: {
        inscripcion_id_disciplina: { inscripcion_id, disciplina },
      },
    });
    if (registro?.graduacion_aplicada) {
      throw new BadRequestException(
        'La graduación ya fue otorgada mediante el diploma; no se pueden modificar los resultados',
      );
    }

    const prevResults = await this.prisma.resultadoExamen.findMany({
      where: { inscripcion_id, disciplina },
    });
    const prevByInst = new Map(prevResults.map((r) => [r.instancia, r]));

    const aAprobar = instancias.slice(0, prefixLen);
    const aResgistrar = [...aAprobar, ...(desaprobada ? [desaprobada] : [])];
    const planMesas = new Map<string, number>();
    for (const instancia of aResgistrar) {
      if (planMesas.has(instancia)) continue;
      const previo = prevByInst.get(instancia);
      planMesas.set(
        instancia,
        previo?.mesa_id ??
          (await this.asignarMesa(
            inscripcion.evento_id,
            disciplina,
            graduacion,
            mesa_id,
          )),
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const instancia of aAprobar) {
        await tx.resultadoExamen.upsert({
          where: {
            inscripcion_id_disciplina_instancia: {
              inscripcion_id,
              disciplina,
              instancia,
            },
          },
          create: {
            inscripcion_id,
            disciplina,
            instancia,
            mesa_id: planMesas.get(instancia),
            aprobado: true,
            cargado_por: user.id,
          },
          update: {
            mesa_id: planMesas.get(instancia),
            aprobado: true,
            cargado_por: user.id,
          },
        });
      }

      if (desaprobada) {
        await tx.resultadoExamen.upsert({
          where: {
            inscripcion_id_disciplina_instancia: {
              inscripcion_id,
              disciplina,
              instancia: desaprobada,
            },
          },
          create: {
            inscripcion_id,
            disciplina,
            instancia: desaprobada,
            mesa_id: planMesas.get(desaprobada),
            aprobado: false,
            cargado_por: user.id,
          },
          update: {
            mesa_id: planMesas.get(desaprobada),
            aprobado: false,
            cargado_por: user.id,
          },
        });
      }

      const aLimpiar = instancias.slice(clearStart);
      for (const instancia of aLimpiar) {
        if (prevByInst.has(instancia)) {
          await tx.resultadoExamen.delete({
            where: {
              inscripcion_id_disciplina_instancia: {
                inscripcion_id,
                disciplina,
                instancia,
              },
            },
          });
        }
      }

      return { message: 'Resultados actualizados correctamente' };
    });
  }

  async registrarPago(
    inscripcionId: number,
    disciplina: string,
    user: AuthUser,
  ) {
    const inscripcion = await this.prisma.inscripcionEvento.findUnique({
      where: { id: inscripcionId },
      include: { evento: true },
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    if (inscripcion.evento.tipo !== 'EXAMEN') {
      throw new BadRequestException(
        'El registro de pago solo corresponde a exámenes',
      );
    }

    const disciplinas = this.parseArray(inscripcion.disciplinas);
    const idx = disciplinas.indexOf(disciplina);
    if (idx === -1) {
      throw new BadRequestException(
        'La disciplina no corresponde a la inscripción',
      );
    }

    const registro = await this.prisma.registroExamen.upsert({
      where: {
        inscripcion_id_disciplina: {
          inscripcion_id: inscripcionId,
          disciplina,
        },
      },
      create: {
        inscripcion_id: inscripcionId,
        disciplina,
        pagado: true,
        graduacion_aplicada: false,
        cargado_por: user.id,
      },
      update: {
        pagado: true,
        cargado_por: user.id,
      },
    });

    return this.formatRegistro(registro);
  }

  private async asignarMesa(
    eventoId: number,
    disciplina: string,
    graduacion: string,
    mesaId?: number,
  ): Promise<number> {
    const mesas = await this.prisma.mesaExaminadora.findMany({
      where: { evento_id: eventoId, disciplina },
    });

    const compatibles = mesas.filter(
      (m) =>
        rankGrad(graduacion) >= rankGrad(m.grad_min) &&
        rankGrad(graduacion) <= rankGrad(m.grad_max),
    );

    if (mesaId !== undefined) {
      const elegida = mesas.find((m) => m.id === mesaId);
      if (!elegida || !compatibles.some((m) => m.id === mesaId)) {
        throw new BadRequestException(
          'La mesa indicada no es compatible con la graduación a rendir',
        );
      }
      return mesaId;
    }

    if (compatibles.length === 0) {
      throw new BadRequestException(
        'No hay mesas compatibles para la graduación a rendir',
      );
    }
    if (compatibles.length > 1) {
      throw new BadRequestException(
        'Hay varias mesas compatibles, debe indicar cuál utilizar',
      );
    }
    return compatibles[0].id;
  }

  private labelInstancia(instancia: string): string {
    return (
      (
        {
          PRACTICO: 'Práctico',
          KATA: 'Kata',
          ESCRITO: 'Escrito',
        } as Record<string, string>
      )[instancia] ?? instancia
    );
  }

  private validarDisciplina(disciplina: string) {
    if (!VALID_DISCIPLINAS.includes(disciplina)) {
      throw new BadRequestException('La disciplina no es válida');
    }
  }

  private validarRango(gradMin: string, gradMax: string) {
    if (
      !GRAD_EXAMEN_VALIDAS.includes(gradMin) ||
      !GRAD_EXAMEN_VALIDAS.includes(gradMax)
    ) {
      throw new BadRequestException('La graduación indicada no es válida');
    }
    if (rankGrad(gradMin) > rankGrad(gradMax)) {
      throw new BadRequestException(
        'La graduación mínima no puede ser mayor que la máxima',
      );
    }
  }

  private validarRangoDelExamen(
    evento: { examen: { graduaciones_a_rendir: Prisma.JsonValue } | null },
    disciplina: string,
    gradMin: string,
    gradMax: string,
  ) {
    const raw = evento.examen?.graduaciones_a_rendir;
    const rangos = Array.isArray(raw)
      ? (raw as Array<{
          disciplina: string;
          grad_min: string;
          grad_max: string;
        }>)
      : [];
    const rango = rangos.find((r) => r.disciplina === disciplina);
    if (!rango) {
      throw new BadRequestException(
        `La disciplina "${disciplina}" no está disponible en este examen`,
      );
    }
    if (
      rankGrad(gradMin) < rankGrad(rango.grad_min) ||
      rankGrad(gradMax) > rankGrad(rango.grad_max)
    ) {
      throw new BadRequestException(
        'El rango de la mesa debe estar dentro de las graduaciones a rendir del examen',
      );
    }
  }

  private parseArray(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'string') return [raw];
    return [];
  }

  private formatMesa(
    mesa: Prisma.MesaExaminadoraGetPayload<Record<string, never>>,
  ) {
    return {
      id: mesa.id,
      evento_id: mesa.evento_id,
      disciplina: mesa.disciplina,
      examinadores: this.parseArray(mesa.examinadores),
      grad_min: mesa.grad_min,
      grad_max: mesa.grad_max,
      creador_id: mesa.creador_id,
      createdAt: mesa.createdAt,
    };
  }

  private formatResultado(
    resultado: Prisma.ResultadoExamenGetPayload<Record<string, never>>,
  ) {
    return {
      id: resultado.id,
      inscripcion_id: resultado.inscripcion_id,
      disciplina: resultado.disciplina,
      instancia: resultado.instancia,
      aprobado: resultado.aprobado,
      mesa_id: resultado.mesa_id,
      cargado_por: resultado.cargado_por,
    };
  }

  private formatRegistro(
    registro: Prisma.RegistroExamenGetPayload<Record<string, never>>,
  ) {
    return {
      id: registro.id,
      inscripcion_id: registro.inscripcion_id,
      disciplina: registro.disciplina,
      pagado: registro.pagado,
      graduacion_aplicada: registro.graduacion_aplicada,
      cargado_por: registro.cargado_por,
    };
  }
}
