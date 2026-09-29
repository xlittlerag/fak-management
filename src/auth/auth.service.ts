import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from './password.service';
import { TwoFactorService } from './two-factor.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { EstadoRegistro } from '@prisma/client';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { randomInt } from 'crypto';

// Alfabeto sin caracteres ambiguos (0/O, 1/I) para códigos de blanqueo.
const ALFABETO_BLANQUEO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LONGITUD_BLANQUEO = 8;
// Intentos fallidos antes de invalidar el código de blanqueo.
const MAX_BLANQUEO_INTENTOS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificaciones: NotificacionesService,
    private passwords: PasswordService,
    private twoFactor: TwoFactorService,
  ) {}

  async requestReset(dni: string) {
    const user = await this.prisma.usuario.findUnique({ where: { dni } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Entropía criptográfica (~41 bits): nunca Math.random().
    let codigo = '';
    for (let i = 0; i < LONGITUD_BLANQUEO; i++) {
      codigo += ALFABETO_BLANQUEO[randomInt(ALFABETO_BLANQUEO.length)];
    }
    const hash = await this.passwords.hash(codigo);
    const expira = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: {
        estado_blanqueo: 'PENDIENTE',
        codigo_blanqueo: hash,
        codigo_blanqueo_expira: expira,
        codigo_blanqueo_intentos: 0,
      },
    });

    this.notificaciones
      .sendPasswordResetEmail(user.email, user.nombre, codigo)
      .catch((err) =>
        this.logger.warn(err, 'Error al enviar email de reseteo de contraseña'),
      );

    return {
      mensaje:
        'Si el DNI existe en el sistema, recibirá un correo con las instrucciones.',
    };
  }

  async completeReset(dni: string, codigo: string, nuevaPassword: string) {
    const user = await this.prisma.usuario.findUnique({ where: { dni } });
    if (!user || !user.codigo_blanqueo || !user.codigo_blanqueo_expira) {
      throw new UnauthorizedException(
        'No hay una solicitud de blanqueo activa para este DNI.',
      );
    }

    if (new Date() > user.codigo_blanqueo_expira) {
      throw new UnauthorizedException(
        'El código ha expirado. Solicite un nuevo blanqueo.',
      );
    }

    // A los 5 intentos fallidos el código se invalida y hay que pedir otro.
    if (user.codigo_blanqueo_intentos >= MAX_BLANQUEO_INTENTOS) {
      await this.prisma.usuario.update({
        where: { id: user.id },
        data: {
          estado_blanqueo: 'APROBADO',
          codigo_blanqueo: null,
          codigo_blanqueo_expira: null,
          codigo_blanqueo_intentos: 0,
        },
      });
      throw new UnauthorizedException(
        'Se superó la cantidad de intentos. Solicite un nuevo blanqueo.',
      );
    }

    if (!(await this.passwords.verify(user.codigo_blanqueo, codigo))) {
      await this.prisma.usuario.update({
        where: { id: user.id },
        data: { codigo_blanqueo_intentos: user.codigo_blanqueo_intentos + 1 },
      });
      throw new UnauthorizedException('El código ingresado es incorrecto.');
    }

    const hashedPassword = await this.passwords.hash(nuevaPassword);

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        estado_blanqueo: 'APROBADO',
        codigo_blanqueo: null,
        codigo_blanqueo_expira: null,
        codigo_blanqueo_intentos: 0,
      },
    });

    return {
      mensaje:
        'Contraseña actualizada correctamente. Ya puede iniciar sesión con su nueva contraseña.',
    };
  }

  async register(dto: RegisterUserDto) {
    const blacklisted = await this.prisma.dniBlacklist.findUnique({
      where: { dni: dto.dni },
    });
    if (blacklisted) {
      throw new ForbiddenException(
        'El DNI ingresado no puede registrarse en el sistema.',
      );
    }

    const existingUser = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ email: dto.email }, { dni: dto.dni }],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'El correo electrónico o el DNI ya se encuentran registrados.',
      );
    }

    const hashedPassword = await this.passwords.hash(dto.password);

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
        telefono: dto.telefono,
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

    this.notificaciones
      .sendWelcomeEmail(dto.email, dto.nombre)
      .catch((err) =>
        this.logger.warn(err, 'Error al enviar email de bienvenida'),
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
      throw new UnauthorizedException(
        'Las credenciales ingresadas son incorrectas.',
      );
    }

    if (!(await this.passwords.verify(user.password, dto.password))) {
      throw new UnauthorizedException(
        'Las credenciales ingresadas son incorrectas.',
      );
    }

    if (user.estado_reg === EstadoRegistro.PENDIENTE_APROBACION) {
      throw new ForbiddenException(
        'Su cuenta aún aguarda la aprobación de su asociación.',
      );
    }

    if (user.estado_reg === EstadoRegistro.RECHAZADO) {
      throw new ForbiddenException(
        'Su cuenta ha sido rechazada. Contacte al administrador.',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
      asociacion_id: user.asociacion_id,
      estado_reg: user.estado_reg,
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
      if (await this.passwords.verify(admin.password, password)) {
        // 2FA opt-in: si está habilitado, el primer paso devuelve un token
        // pendiente (5 min) y la sesión recién se crea al verificar el código.
        if (admin.totp_habilitado) {
          const token_pendiente = this.jwtService.sign(
            { sub: admin.id, pendiente_2fa: true },
            { expiresIn: '5m' },
          );
          return { requiere_2fa: true as const, token_pendiente };
        }

        const payload = {
          sub: admin.id,
          email: 'admin@kendo-manager',
          rol: 'ADMIN_GENERAL' as const,
          asociacion_id: 0,
          estado_reg: 'APROBADO' as const,
        };

        return { access_token: this.jwtService.sign(payload) };
      }
    }

    throw new UnauthorizedException(
      'Credenciales de administrador incorrectas.',
    );
  }

  // --- 2FA TOTP del admin general ---

  private exigirAdmin2faDisponible() {
    if (!this.twoFactor.disponible) {
      throw new ServiceUnavailableException(
        'El segundo factor no está configurado en el servidor. Contacte al responsable técnico.',
      );
    }
  }

  /** Segundo paso de admin-login: valida el token pendiente + código TOTP o de respaldo. */
  async verificarAdmin2fa(tokenPendiente: string, codigo: string) {
    let payload: { sub: number; pendiente_2fa?: boolean };
    try {
      payload = this.jwtService.verify(tokenPendiente);
    } catch {
      throw new UnauthorizedException(
        'La verificación ha expirado. Inicie sesión nuevamente.',
      );
    }
    if (!payload?.pendiente_2fa || typeof payload.sub !== 'number') {
      throw new UnauthorizedException(
        'Verificación inválida. Inicie sesión nuevamente.',
      );
    }

    const admin = await this.prisma.adminGeneral.findUnique({
      where: { id: payload.sub },
    });
    if (!admin?.totp_habilitado || !admin.totp_secreto) {
      throw new UnauthorizedException(
        'El segundo factor no se encuentra habilitado.',
      );
    }

    const codigoLimpio = (codigo || '').trim();
    let secreto: string;
    try {
      secreto = this.twoFactor.descifrar(admin.totp_secreto);
    } catch {
      throw new ServiceUnavailableException(
        'El segundo factor no está configurado en el servidor. Contacte al responsable técnico.',
      );
    }
    const verificado = this.twoFactor.verificar(secreto, codigoLimpio);

    // Si el TOTP falla, se acepta un código de respaldo (un solo uso).
    if (!verificado) {
      const hashes: string[] = admin.totp_codigos_respaldo
        ? (JSON.parse(admin.totp_codigos_respaldo) as string[])
        : [];
      let usado = false;
      const restantes: string[] = [];
      for (const h of hashes) {
        if (!usado && (await this.passwords.verify(h, codigoLimpio))) {
          usado = true;
          continue;
        }
        restantes.push(h);
      }
      if (!usado) {
        throw new UnauthorizedException('El código ingresado es incorrecto.');
      }
      await this.prisma.adminGeneral.update({
        where: { id: admin.id },
        data: { totp_codigos_respaldo: JSON.stringify(restantes) },
      });
    }

    const sessionPayload = {
      sub: admin.id,
      email: 'admin@kendo-manager',
      rol: 'ADMIN_GENERAL' as const,
      asociacion_id: 0,
      estado_reg: 'APROBADO' as const,
    };
    return { access_token: this.jwtService.sign(sessionPayload) };
  }

  /** Primer paso de activación: genera el secreto y devuelve QR + otpauth (no habilita aún). */
  async iniciarSetup2fa(adminId: number) {
    this.exigirAdmin2faDisponible();
    const admin = await this.prisma.adminGeneral.findUnique({
      where: { id: adminId },
    });
    if (!admin) throw new NotFoundException('Administrador no encontrado.');
    if (admin.totp_habilitado) {
      throw new ConflictException(
        'El segundo factor ya se encuentra habilitado. Deshabilítelo antes de generar uno nuevo.',
      );
    }

    const { secreto, otpauthUrl } = this.twoFactor.generarSecreto();
    await this.prisma.adminGeneral.update({
      where: { id: admin.id },
      data: { totp_secreto: this.twoFactor.cifrar(secreto) },
    });
    const qr = await this.twoFactor.generarQR(otpauthUrl);
    return { otpauth_url: otpauthUrl, qr, secreto_manual: secreto };
  }

  /** Segundo paso de activación: verifica el código y habilita el 2FA + emite respaldos. */
  async confirmarSetup2fa(adminId: number, codigo: string) {
    this.exigirAdmin2faDisponible();
    const admin = await this.prisma.adminGeneral.findUnique({
      where: { id: adminId },
    });
    if (!admin?.totp_secreto) {
      throw new NotFoundException(
        'No hay una activación en curso. Genere el código QR primero.',
      );
    }
    if (admin.totp_habilitado) {
      throw new ConflictException(
        'El segundo factor ya se encuentra habilitado.',
      );
    }

    const secreto = this.twoFactor.descifrar(admin.totp_secreto);
    if (!this.twoFactor.verificar(secreto, (codigo || '').trim())) {
      throw new UnauthorizedException(
        'El código ingresado es incorrecto. Verifique su aplicación autenticadora.',
      );
    }

    const planos = this.twoFactor.generarCodigosRespaldoPlano();
    const hashes: string[] = [];
    for (const c of planos) {
      hashes.push(await this.passwords.hash(c));
    }
    await this.prisma.adminGeneral.update({
      where: { id: admin.id },
      data: {
        totp_habilitado: true,
        totp_codigos_respaldo: JSON.stringify(hashes),
      },
    });
    return { codigos_respaldo: planos };
  }

  async deshabilitar2fa(adminId: number, password: string) {
    const admin = await this.prisma.adminGeneral.findUnique({
      where: { id: adminId },
    });
    if (!admin) throw new NotFoundException('Administrador no encontrado.');
    if (!(await this.passwords.verify(admin.password, password))) {
      throw new UnauthorizedException('La contraseña ingresada es incorrecta.');
    }
    await this.prisma.adminGeneral.update({
      where: { id: admin.id },
      data: {
        totp_habilitado: false,
        totp_secreto: null,
        totp_codigos_respaldo: null,
      },
    });
    return {
      mensaje: 'El segundo factor ha sido deshabilitado correctamente.',
    };
  }

  async regenerarRespaldo2fa(adminId: number) {
    const admin = await this.prisma.adminGeneral.findUnique({
      where: { id: adminId },
    });
    if (!admin?.totp_habilitado) {
      throw new NotFoundException(
        'El segundo factor no se encuentra habilitado.',
      );
    }
    const planos = this.twoFactor.generarCodigosRespaldoPlano();
    const hashes: string[] = [];
    for (const c of planos) {
      hashes.push(await this.passwords.hash(c));
    }
    await this.prisma.adminGeneral.update({
      where: { id: admin.id },
      data: { totp_codigos_respaldo: JSON.stringify(hashes) },
    });
    return { codigos_respaldo: planos };
  }

  async estado2fa(adminId: number) {
    const admin = await this.prisma.adminGeneral.findUnique({
      where: { id: adminId },
      select: {
        totp_habilitado: true,
        totp_secreto: true,
        totp_codigos_respaldo: true,
      },
    });
    if (!admin) throw new NotFoundException('Administrador no encontrado.');
    let respaldos_restantes = 0;
    if (admin.totp_codigos_respaldo) {
      try {
        respaldos_restantes = (
          JSON.parse(admin.totp_codigos_respaldo) as string[]
        ).length;
      } catch {
        respaldos_restantes = 0;
      }
    }
    return {
      habilitado: admin.totp_habilitado,
      activacion_en_curso:
        !admin.totp_habilitado && admin.totp_secreto !== null,
      respaldos_restantes,
    };
  }
}
