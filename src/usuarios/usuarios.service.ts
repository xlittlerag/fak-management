import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoRegistro, Rol, Graduacion } from '@prisma/client';
import { AprobacionAccion, UpdateAprobacionDto } from './dto/update-aprobacion.dto';
import * as bcrypt from 'bcrypt';

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

  async findAll(user: any) {
    const where: any = { estado_reg: EstadoRegistro.APROBADO };
    if (user.rol === Rol.ADMIN_ASOCIACION) {
      where.asociacion_id = user.asociacion_id;
    }

    return this.prisma.usuario.findMany({
      where,
      include: { asociacion: true },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      include: { asociacion: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updatePerfil(id: number, dto: any) {
    const data: any = { ...dto };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    if (data.fecha_nacimiento) {
      data.fecha_nacimiento = new Date(data.fecha_nacimiento);
    }

    try {
      return await this.prisma.usuario.update({
        where: { id },
        data,
      });
    } catch (e) {
      throw new ConflictException('No se pudo actualizar el perfil. Verifique los datos.');
    }
  }

  async updateRol(id: number, rol: Rol) {
    return this.prisma.usuario.update({
      where: { id },
      data: { rol },
    });
  }

  async updateGraduacion(id: number, dto: any) {
    const data: any = {};
    
    const mapGrad = (g: string) => {
      if (!g || g === 'SIN_GRADUACION') return 'SIN_GRADUACION' as Graduacion;
      if (g.includes('_')) {
        const parts = g.split('_');
        return `${parts[1]}_${parts[0]}` as Graduacion;
      }
      return g as Graduacion;
    };

    if (dto.grad_kendo !== undefined) data.grad_kendo = mapGrad(dto.grad_kendo);
    if (dto.f_grad_kendo !== undefined) data.f_grad_kendo = dto.f_grad_kendo ? new Date(dto.f_grad_kendo) : null;
    if (dto.grad_iaido !== undefined) data.grad_iaido = mapGrad(dto.grad_iaido);
    if (dto.f_grad_iaido !== undefined) data.f_grad_iaido = dto.f_grad_iaido ? new Date(dto.f_grad_iaido) : null;
    if (dto.grad_jodo !== undefined) data.grad_jodo = mapGrad(dto.grad_jodo);
    if (dto.f_grad_jodo !== undefined) data.f_grad_jodo = dto.f_grad_jodo ? new Date(dto.f_grad_jodo) : null;

    return this.prisma.usuario.update({
      where: { id },
      data,
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
      throw new ForbiddenException('Usted no tiene permisos para aprobar usuarios de otra asociación');
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
