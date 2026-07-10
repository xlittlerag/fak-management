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

    return {
      datos,
      total,
      pagina,
      total_paginas: Math.ceil(total / limite),
    };
  }

  async findOne(id: number) {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }
}
