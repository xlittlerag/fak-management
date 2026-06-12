import { Injectable, ConflictException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { EstadoRegistro } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async requestReset(dni: string) {
    const user = await this.prisma.usuario.findUnique({ where: { dni } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.usuario.update({
      where: { id: user.id },
      data: { estado_blanqueo: 'PENDIENTE' },
    });
  }

  async register(dto: RegisterUserDto) {
    const existingUser = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ email: dto.email }, { dni: dto.dni }],
      },
    });

    if (existingUser) {
      throw new ConflictException('El correo electrónico o el DNI ya se encuentran registrados.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.usuario.create({
      data: {
        ...dto,
        password: hashedPassword,
        fecha_nacimiento: new Date(dto.fecha_nacimiento),
        rol: 'BASICO',
        estado_reg: 'PENDIENTE_APROBACION',
        grad_kendo: 'SIN_GRADUACION',
        grad_iaido: 'SIN_GRADUACION',
        estado_pago: false,
      },
    });
  }


  async login(dto: LoginDto) {
    const user = await (this.prisma.usuario as any).findUnique({
      where: { dni: dto.dni },
      select: {
        id: true,
        email: true,
        password: true,
        rol: true,
        asociacion_id: true,
        estado_reg: true,
        estado_blanqueo: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Las credenciales ingresadas son incorrectas.');
    }

    // Solo validar contraseña, no resetear estado aquí
    if (!(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Las credenciales ingresadas son incorrectas.');
    }

    if (user.estado_reg === EstadoRegistro.PENDIENTE_APROBACION) {
      throw new ForbiddenException('Su cuenta aún aguarda la aprobación de su dojo.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
      asociacion_id: user.asociacion_id,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
