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
        email: dto.email,
        password: hashedPassword,
        nombre: dto.nombre,
        apellido: dto.apellido,
        dni: dto.dni,
        fecha_nacimiento: new Date(dto.fecha_nacimiento),
        sexo: dto.sexo,
        calle_altura: dto.calle_altura,
        piso_depto: dto.piso_depto,
        ciudad: dto.ciudad,
        provincia: dto.provincia,
        codigo_postal: dto.codigo_postal,
        asociacion_id: dto.asociacion_id,
        dojo_id: dto.dojo_id,
        rol: 'BASICO',
        estado_reg: 'PENDIENTE_APROBACION',
        grad_kendo: 'SIN_GRADUACION',
        grad_iaido: 'SIN_GRADUACION',
        grad_jodo: 'SIN_GRADUACION',
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
        estado_pago: true,
        estado_blanqueo: true,
      },
    });

    if (!user) {
      const admin = await this.prisma.adminGeneral.findUnique({
        where: { dni: dto.dni },
      });
      if (!admin || !(await bcrypt.compare(dto.password, admin.password))) {
        throw new UnauthorizedException('Las credenciales ingresadas son incorrectas.');
      }
      const payload = {
        sub: admin.id,
        email: 'admin@kendo-manager',
        rol: 'ADMIN_GENERAL' as const,
        asociacion_id: 0,
      };
      return { access_token: this.jwtService.sign(payload) };
    }

    // Solo validar contraseña, no resetear estado aquí
    if (!(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Las credenciales ingresadas son incorrectas.');
    }

    // Auto-desactivar si la cuota está vencida y no se ha pagado
    const feeConfig = await this.prisma.$queryRaw<Array<{ fecha_vencimiento: Date }>>`
      SELECT fecha_vencimiento FROM cuotaglobal ORDER BY id DESC LIMIT 1
    `;
    const isFeeOverdue = feeConfig && feeConfig.length > 0 && new Date(feeConfig[0].fecha_vencimiento) < new Date();

    if (isFeeOverdue && !user.estado_pago) {
      await this.prisma.usuario.update({
        where: { id: user.id },
        data: { estado_reg: 'PENDIENTE_APROBACION' },
      });
    }

    if (user.estado_reg === EstadoRegistro.PENDIENTE_APROBACION) {
      const isGenuinelyPending = !isFeeOverdue || user.estado_pago !== false;
      if (isGenuinelyPending) {
        throw new ForbiddenException('Su cuenta aún aguarda la aprobación de su dojo.');
      }
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
