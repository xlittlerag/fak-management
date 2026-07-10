import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditoriaFiltros {
  entidad?: string;
  usuario_id?: number;
  accion?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
  limite?: number;
}

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filtros: AuditoriaFiltros) {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 50, 100);
    const skip = (pagina - 1) * limite;

    const where: Record<string, unknown> = {};

    if (filtros.entidad) {
      where.entidad = filtros.entidad;
    }

    if (filtros.usuario_id) {
      where.usuario_id = filtros.usuario_id;
    }

    if (filtros.accion) {
      where.accion = filtros.accion;
    }

    if (filtros.desde || filtros.hasta) {
      const createdAt: Record<string, Date> = {};
      if (filtros.desde) {
        createdAt.gte = new Date(filtros.desde);
      }
      if (filtros.hasta) {
        createdAt.lte = new Date(filtros.hasta);
      }
      where.created_at = createdAt;
    }

    const [datos, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limite,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const enriched = await this.enrichEntries(datos);

    return {
      datos: enriched,
      total,
      pagina,
      total_paginas: Math.ceil(total / limite),
    };
  }

  async findOne(id: number) {
    const entry = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!entry) return null;
    const enriched = await this.enrichEntries([entry]);
    return enriched[0];
  }

  // ── batch enrichment ──────────────────────────────────────────

  private async enrichEntries(entries: AuditLogShape[]) {
    if (entries.length === 0) return [];

    const userIds = [
      ...new Set(entries.filter(e => e.usuario_id).map(e => e.usuario_id as number)),
    ];

    const entidadGroups = new Map<string, number[]>();
    for (const e of entries) {
      const key = e.entidad;
      if (!entidadGroups.has(key)) entidadGroups.set(key, []);
      entidadGroups.get(key)!.push(e.entidad_id);
    }
    for (const [key, ids] of entidadGroups) {
      entidadGroups.set(key, [...new Set(ids)]);
    }

    const [userMap, entidadMaps] = await Promise.all([
      this.resolveUsers(userIds),
      this.resolveEntidades(entidadGroups),
    ]);

    return entries.map(entry => ({
      ...entry,
      usuario_nombre: entry.usuario_id
        ? userMap.get(entry.usuario_id) ?? null
        : null,
      entidad_nombre:
        entidadMaps.get(entry.entidad)?.get(entry.entidad_id) ??
        `#${entry.entidad_id}`,
    }));
  }

  private async resolveUsers(ids: number[]) {
    if (ids.length === 0) return new Map<number, string>();
    const users = await this.prisma.usuario.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true, apellido: true },
    });
    return new Map(users.map(u => [u.id, `${u.nombre} ${u.apellido}`]));
  }

  private async resolveEntidades(
    groups: Map<string, number[]>,
  ): Promise<Map<string, Map<number, string>>> {
    const tasks: Promise<[string, Map<number, string>]>[] = [];
    for (const [entidad, ids] of groups) {
      tasks.push(this.resolveEntidad(entidad, ids));
    }
    const results = await Promise.all(tasks);
    const combined = new Map<string, Map<number, string>>();
    for (const [key, map] of results) {
      combined.set(key, map);
    }
    return combined;
  }

  private async resolveEntidad(
    entidad: string,
    ids: number[],
  ): Promise<[string, Map<number, string>]> {
    switch (entidad) {
      case 'Usuario': {
        const items = await this.prisma.usuario.findMany({
          where: { id: { in: ids } },
          select: { id: true, nombre: true, apellido: true },
        });
        return [
          entidad,
          new Map(items.map(i => [i.id, `${i.nombre} ${i.apellido}`])),
        ];
      }
      case 'Asociacion': {
        const items = await this.prisma.asociacion.findMany({
          where: { id: { in: ids } },
          select: { id: true, nombre: true },
        });
        return [entidad, new Map(items.map(i => [i.id, i.nombre]))];
      }
      case 'Dojo': {
        const items = await this.prisma.dojo.findMany({
          where: { id: { in: ids } },
          select: { id: true, nombre: true },
        });
        return [entidad, new Map(items.map(i => [i.id, i.nombre]))];
      }
      case 'Evento': {
        const items = await this.prisma.evento.findMany({
          where: { id: { in: ids } },
          select: { id: true, tipo: true, fecha_inicio: true },
        });
        return [
          entidad,
          new Map(items.map(i => [
            i.id,
            `${i.tipo} - ${i.fecha_inicio.toLocaleDateString('es-AR')}`,
          ])),
        ];
      }
      case 'InscripcionEvento': {
        const items = await this.prisma.inscripcionEvento.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            usuario_id: true,
            evento: { select: { tipo: true } },
          },
        });
        const insUserIds = [...new Set(items.map(i => i.usuario_id))];
        const insUsers =
          insUserIds.length > 0
            ? await this.prisma.usuario.findMany({
                where: { id: { in: insUserIds } },
                select: { id: true, nombre: true, apellido: true },
              })
            : [];
        const insUserMap = new Map(
          insUsers.map(u => [u.id, `${u.nombre} ${u.apellido}`]),
        );
        return [
          entidad,
          new Map(
            items.map(i => [
              i.id,
              `${insUserMap.get(i.usuario_id) ?? `Usuario #${i.usuario_id}`} → ${i.evento.tipo}`,
            ]),
          ),
        ];
      }
      case 'PrecioExamen': {
        const items = await this.prisma.precioExamen.findMany({
          where: { id: { in: ids } },
          select: { id: true, graduacion: true },
        });
        return [entidad, new Map(items.map(i => [i.id, i.graduacion]))];
      }
      case 'CuotaGlobal': {
        const items = await this.prisma.cuotaGlobal.findMany({
          where: { id: { in: ids } },
          select: { id: true, monto_actual: true },
        });
        return [
          entidad,
          new Map(items.map(i => [i.id, `$ ${i.monto_actual}`])),
        ];
      }
      case 'DiplomaNacional': {
        const items = await this.prisma.diplomaNacional.findMany({
          where: { id: { in: ids } },
          select: { id: true, disciplina: true, graduacion: true },
        });
        return [
          entidad,
          new Map(
            items.map(i => [i.id, `${i.disciplina} - ${i.graduacion}`]),
          ),
        ];
      }
      case 'ReimpresionDiploma': {
        const items = await this.prisma.reimpresionDiploma.findMany({
          where: { id: { in: ids } },
          select: { id: true, diploma_id: true },
        });
        return [
          entidad,
          new Map(items.map(i => [i.id, `Diploma #${i.diploma_id}`])),
        ];
      }
      case 'CertificadoExterno': {
        const items = await this.prisma.certificadoExterno.findMany({
          where: { id: { in: ids } },
          select: { id: true, disciplina: true, grad_solicitada: true },
        });
        return [
          entidad,
          new Map(
            items.map(i => [
              i.id,
              `${i.disciplina} - ${i.grad_solicitada}`,
            ]),
          ),
        ];
      }
      case 'HistorialGraduacion': {
        const items = await this.prisma.historialGraduacion.findMany({
          where: { id: { in: ids } },
          select: { id: true, disciplina: true },
        });
        return [
          entidad,
          new Map(items.map(i => [i.id, i.disciplina])),
        ];
      }
      case 'Torneo': {
        const items = await this.prisma.torneo.findMany({
          where: { id: { in: ids } },
          select: { id: true, evento: { select: { tipo: true, fecha_inicio: true } } },
        });
        return [
          entidad,
          new Map(
            items.map(i => [
              i.id,
              `Torneo: ${i.evento.tipo} - ${i.evento.fecha_inicio.toLocaleDateString('es-AR')}`,
            ]),
          ),
        ];
      }
      case 'Examen': {
        const items = await this.prisma.examen.findMany({
          where: { id: { in: ids } },
          select: { id: true, evento: { select: { tipo: true, fecha_inicio: true } } },
        });
        return [
          entidad,
          new Map(
            items.map(i => [
              i.id,
              `Examen: ${i.evento.tipo} - ${i.evento.fecha_inicio.toLocaleDateString('es-AR')}`,
            ]),
          ),
        ];
      }
      case 'Seminario': {
        const items = await this.prisma.seminario.findMany({
          where: { id: { in: ids } },
          select: { id: true, evento: { select: { tipo: true, fecha_inicio: true } } },
        });
        return [
          entidad,
          new Map(
            items.map(i => [
              i.id,
              `Seminario: ${i.evento.tipo} - ${i.evento.fecha_inicio.toLocaleDateString('es-AR')}`,
            ]),
          ),
        ];
      }
      default: {
        return [entidad, new Map()];
      }
    }
  }
}

type AuditLogShape = {
  id: number;
  accion: string;
  entidad: string;
  entidad_id: number;
  usuario_id: number | null;
  datos_previos: unknown | null;
  datos_nuevos: unknown | null;
  ip: string | null;
  user_agent: string | null;
  created_at: Date;
};
