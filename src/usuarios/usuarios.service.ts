import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoRegistro, Rol } from '@prisma/client';
import { AprobacionAccion, UpdateAprobacionDto } from './dto/update-aprobacion.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findPendientes(user: any) {
    const where: any = {
      estado_reg: EstadoRegistro.PENDIENTE_APROBACION,
    };

    if (user.rol === Rol.ADMIN_ASOCIACION) {
      where.asociacion_id = user.asociacion_id;
    }

    return this.prisma.usuario.findMany({
      where,
      include: { asociacion: true },
    });
  }

  async updateAprobacion(id: number, dto: UpdateAprobacionDto, admin: any) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (admin.rol === Rol.ADMIN_ASOCIACION && user.asociacion_id !== admin.asociacion_id) {
      throw new ForbiddenException('No tiene permisos para aprobar usuarios de otra asociación');
    }

    const newEstado = dto.accion === AprobacionAccion.APROBAR 
      ? EstadoRegistro.APROBADO 
      : EstadoRegistro.RECHAZADO;

    return this.prisma.usuario.update({
      where: { id },
      data: { estado_reg: newEstado },
    });
  }
}
