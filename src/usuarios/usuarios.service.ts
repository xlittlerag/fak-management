import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeeConfigService } from '../pagos/fee-config.service';
import { EstadoRegistro, Rol, Graduacion } from '@prisma/client';
import { AprobacionAccion, UpdateAprobacionDto } from './dto/update-aprobacion.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import * as bcrypt from 'bcrypt';

const GraduacionInputMap: Record<string, Graduacion> = {
  'SIN_GRADUACION': 'SIN_GRADUACION',
  '3_KYU': 'KYU_3',
  '2_KYU': 'KYU_2',
  '1_KYU': 'KYU_1',
  '1_DAN': 'DAN_1',
  '2_DAN': 'DAN_2',
  '3_DAN': 'DAN_3',
  '4_DAN': 'DAN_4',
  '5_DAN': 'DAN_5',
  '6_DAN': 'DAN_6',
  '7_DAN': 'DAN_7',
  '8_DAN': 'DAN_8',
};

function mapGrad(g: string): Graduacion {
  return GraduacionInputMap[g] ?? (g as Graduacion);
}

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private readonly feeConfigService: FeeConfigService,
  ) {}

  async findPendientes(user: any) {
    const where: any = {
      estado_reg: EstadoRegistro.PENDIENTE_APROBACION,
    };

    if (user.rol === Rol.ADMIN_ASOCIACION) {
      where.asociacion_id = user.asociacion_id;
    }

    return this.prisma.usuario.findMany({
      where,
      include: { asociacion: true, dojo: true },
    });
  }

  async findAll(user: any, pagination?: { skip?: number; take?: number }) {
    const where: any = { estado_reg: EstadoRegistro.APROBADO };
    if (user.rol === Rol.ADMIN_ASOCIACION) {
      where.asociacion_id = user.asociacion_id;
    }

    return this.prisma.usuario.findMany({
      where,
      include: { asociacion: true, dojo: true },
      skip: pagination?.skip,
      take: pagination?.take,
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

  async updatePerfil(id: number, dto: UpdatePerfilDto) {
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
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException('Usuario no encontrado');
      }
      if (err.code === 'P2002') {
        throw new ConflictException('El correo electrónico ya se encuentra en uso.');
      }
      throw err;
    }
  }

  async updateRol(id: number, rol: Rol) {
    const user = await this.prisma.usuario.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.prisma.usuario.update({
      where: { id },
      data: { rol },
    });
  }

  async updateGraduacion(id: number, dto: any) {
    const user = await this.prisma.usuario.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const data: any = {};

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

  async getCuota(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        estado_pago: true,
      },
    });

    const fee = await this.feeConfigService.getFeeConfig();
    const today = new Date();
    const estaVencida = fee ? new Date(fee.fecha_vencimiento) < today : false;

    return {
      monto_actual: fee?.monto_actual ?? null,
      fecha_vencimiento: fee?.fecha_vencimiento ?? null,
      usuario_tiene_pago: user?.estado_pago ?? false,
      esta_vencida: estaVencida,
    };
  }
}
