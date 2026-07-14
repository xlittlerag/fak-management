import { Injectable, ConflictException, UnauthorizedException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { EstadoRegistro } from '@prisma/client';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificaciones: NotificacionesService,
  ) {}

  async requestReset(dni: string) {
    const user = await this.prisma.usuario.findUnique({ where: { dni } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { estado_blanqueo: 'PENDIENTE' },
    });

    this.notificaciones.sendPasswordResetEmail(user.email, user.nombre, codigo).catch(err =>
      this.logger.warn(err, 'Error al enviar email de reseteo de contraseña')
    );

    return { mensaje: 'Si el DNI existe en el sistema, recibirá un correo con las instrucciones.' };
  }

  async register(dto: RegisterUserDto) {
    const blacklisted = await this.prisma.dniBlacklist.findUnique({
      where: { dni: dto.dni },
    });
    if (blacklisted) {
      throw new ForbiddenException('El DNI ingresado no puede registrarse en el sistema.');
    }

    const existingUser = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ email: dto.email }, { dni: dto.dni }],
      },
    });

    if (existingUser) {
      throw new ConflictException('El correo electrónico o el DNI ya se encuentran registrados.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.usuario.create({
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
        telefono: dto.telefono ?? null,
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

    this.notificaciones.sendWelcomeEmail(dto.email, dto.nombre).catch(err =>
      this.logger.warn(err, 'Error al enviar email de bienvenida')
    );

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { dni: dto.dni },
      select: {
        id: true,
        email: true,
        password: true,
        rol: true,
        asociacion_id: true,
        estado_reg: true,
        grad_kendo: true,
        grad_iaido: true,
        grad_jodo: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Las credenciales ingresadas son incorrectas.');
    }

    if (!(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Las credenciales ingresadas son incorrectas.');
    }

    if (user.estado_reg === EstadoRegistro.PENDIENTE_APROBACION) {
      throw new ForbiddenException('Su cuenta aún aguarda la aprobación de su asociación.');
    }

    if (user.estado_reg === EstadoRegistro.RECHAZADO) {
      throw new ForbiddenException('Su cuenta ha sido rechazada. Contacte al administrador.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
      asociacion_id: user.asociacion_id,
      grad_kendo: user.grad_kendo,
      grad_iaido: user.grad_iaido,
      grad_jodo: user.grad_jodo,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async adminLogin(password: string) {
    const admins = await this.prisma.adminGeneral.findMany();

    for (const admin of admins) {
      if (await bcrypt.compare(password, admin.password)) {
        const payload = {
          sub: admin.id,
          email: 'admin@kendo-manager',
          rol: 'ADMIN_GENERAL' as const,
          asociacion_id: 0,
        };

        return { access_token: this.jwtService.sign(payload) };
      }
    }

    throw new UnauthorizedException('Credenciales de administrador incorrectas.');
  }
}
