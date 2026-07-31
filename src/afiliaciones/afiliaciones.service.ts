import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EstadoRegistro, Rol } from '@prisma/client';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { AltaDirectaDto } from './dto/alta-directa.dto';
import { SolicitarAltaDto } from './dto/solicitar-alta.dto';

@Injectable()
export class AfiliacionesService {
  private readonly logger = new Logger(AfiliacionesService.name);

  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
  ) {}

  private async getFakEmail(): Promise<string | null> {
    const config = await this.prisma.configSistema.findFirst();
    return config?.fak_email ?? null;
  }

  private async getAdminsAsociacion(asociacionId: number) {
    return this.prisma.usuario.findMany({
      where: {
        asociacion_id: asociacionId,
        rol: Rol.ADMIN_ASOCIACION,
        estado_reg: EstadoRegistro.APROBADO,
      },
      select: { email: true, nombre: true },
    });
  }

  private async enviarAFederacion(
    fn: (email: string) => Promise<void>,
  ): Promise<void> {
    const fakEmail = await this.getFakEmail();
    if (!fakEmail) {
      this.logger.warn(
        'fak_email no configurado — email a la federación no enviado',
      );
      return;
    }
    fn(fakEmail).catch((err) =>
      this.logger.warn(
        err,
        'Error al enviar email a la federación (%s)',
        fakEmail,
      ),
    );
  }

  private async enviarAAdminsAsociacion(
    asociacionId: number,
    fn: (admin: { email: string; nombre: string }) => Promise<void>,
  ): Promise<void> {
    const admins = await this.getAdminsAsociacion(asociacionId);
    for (const admin of admins) {
      fn(admin).catch((err) =>
        this.logger.warn(err, 'Error al enviar email a %s', admin.email),
      );
    }
  }

  private async getAsociacionNombre(asociacionId: number): Promise<string> {
    const asociacion = await this.prisma.asociacion.findUnique({
      where: { id: asociacionId },
      select: { nombre: true },
    });
    return asociacion?.nombre ?? '';
  }

  private async verificarDojoEnAsociacion(
    dojoId: number,
    asociacionId: number,
  ): Promise<void> {
    const dojo = await this.prisma.dojo.findUnique({ where: { id: dojoId } });
    if (!dojo || dojo.deleted_at || dojo.asociacion_id !== asociacionId) {
      throw new BadRequestException(
        'El dojo seleccionado no pertenece a la asociación',
      );
    }
  }

  async solicitarBajaPropia(user: AuthUser, motivo?: string) {
    const socio = await this.prisma.usuario.findUnique({
      where: { id: user.id },
    });
    if (!socio) throw new NotFoundException('Usuario no encontrado');
    if (socio.estado_reg !== EstadoRegistro.APROBADO) {
      throw new BadRequestException(
        'Solo un socio activo puede solicitar su desafiliación',
      );
    }

    const asociacionId = socio.asociacion_id;

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: socio.id },
        data: { estado_reg: EstadoRegistro.DESAFILIADO, rol: Rol.BASICO },
      }),
      this.prisma.solicitudAfiliacion.create({
        data: {
          tipo: 'BAJA_SOCIO',
          usuario_id: socio.id,
          estado: 'APROBADO',
          asociacion_id: asociacionId,
          motivo,
          resuelto_por: socio.id,
        },
      }),
    ]);

    const nombreSocio = `${socio.nombre} ${socio.apellido}`;
    const asociacionNombre = await this.getAsociacionNombre(asociacionId);
    await this.notificaciones
      .sendBajaConfirmadaSocio(socio.email, socio.nombre, asociacionNombre)
      .catch((err) =>
        this.logger.warn(err, 'Error al enviar email a %s', socio.email),
      );
    await this.enviarAAdminsAsociacion(asociacionId, (admin) =>
      this.notificaciones.sendBajaInformadaAsociacion(
        admin.email,
        admin.nombre,
        nombreSocio,
      ),
    );
    await this.enviarAFederacion((email) =>
      this.notificaciones.sendBajaInformadaFederacion(
        email,
        nombreSocio,
        asociacionNombre,
      ),
    );

    return this.prisma.usuario.findUnique({ where: { id: socio.id } });
  }

  async solicitarBajaAsociacion(
    admin: AuthUser,
    usuarioId: number,
    motivo?: string,
  ) {
    const socio = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!socio) throw new NotFoundException('Usuario no encontrado');
    if (
      admin.rol === Rol.ADMIN_ASOCIACION &&
      socio.asociacion_id !== admin.asociacion_id
    ) {
      throw new ForbiddenException(
        'No puede solicitar la baja de un socio de otra asociación',
      );
    }
    if (socio.estado_reg !== EstadoRegistro.APROBADO) {
      throw new BadRequestException('El socio no está activo');
    }

    const solicitud = await this.prisma.solicitudAfiliacion.create({
      data: {
        tipo: 'BAJA_ASOCIACION',
        usuario_id: socio.id,
        estado: 'PENDIENTE',
        asociacion_id: socio.asociacion_id,
        motivo,
      },
    });

    const nombreSocio = `${socio.nombre} ${socio.apellido}`;
    const asociacionNombre = await this.getAsociacionNombre(
      socio.asociacion_id,
    );
    await this.enviarAFederacion((email) =>
      this.notificaciones.sendBajaSolicitadaFederacion(
        email,
        nombreSocio,
        asociacionNombre,
      ),
    );

    return solicitud;
  }

  async pendientesBaja() {
    return this.prisma.solicitudAfiliacion.findMany({
      where: { tipo: 'BAJA_ASOCIACION', estado: 'PENDIENTE' },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            dni: true,
            email: true,
          },
        },
        asociacion: { select: { id: true, nombre: true } },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async aprobarBaja(solicitudId: number) {
    const solicitud = await this.prisma.solicitudAfiliacion.findUnique({
      where: { id: solicitudId },
      include: {
        usuario: { select: { email: true, nombre: true, apellido: true } },
      },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.tipo !== 'BAJA_ASOCIACION') {
      throw new BadRequestException('La solicitud no corresponde a una baja');
    }
    if (!solicitud.asociacion_id) {
      throw new BadRequestException(
        'La solicitud no tiene asociación asociada',
      );
    }
    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException('La solicitud ya fue resuelta');
    }

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: solicitud.usuario_id },
        data: { estado_reg: EstadoRegistro.DESAFILIADO, rol: Rol.BASICO },
      }),
      this.prisma.solicitudAfiliacion.update({
        where: { id: solicitudId },
        data: { estado: 'APROBADO', resuelto_por: 0 },
      }),
    ]);

    const nombreSocio = `${solicitud.usuario.nombre} ${solicitud.usuario.apellido}`;
    const asociacionNombre = await this.getAsociacionNombre(
      solicitud.asociacion_id,
    );
    await this.notificaciones
      .sendBajaConfirmadaSocio(
        solicitud.usuario.email,
        solicitud.usuario.nombre,
        asociacionNombre,
      )
      .catch((err) =>
        this.logger.warn(
          err,
          'Error al enviar email a %s',
          solicitud.usuario.email,
        ),
      );
    await this.enviarAAdminsAsociacion(solicitud.asociacion_id, (admin) =>
      this.notificaciones.sendBajaInformadaAsociacion(
        admin.email,
        admin.nombre,
        nombreSocio,
      ),
    );

    return this.prisma.solicitudAfiliacion.findUnique({
      where: { id: solicitudId },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            dni: true,
            email: true,
          },
        },
      },
    });
  }

  async rechazarBaja(solicitudId: number, motivo?: string) {
    const solicitud = await this.prisma.solicitudAfiliacion.findUnique({
      where: { id: solicitudId },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.tipo !== 'BAJA_ASOCIACION') {
      throw new BadRequestException('La solicitud no corresponde a una baja');
    }
    if (!solicitud.asociacion_id) {
      throw new BadRequestException(
        'La solicitud no tiene asociación asociada',
      );
    }
    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException('La solicitud ya fue resuelta');
    }

    await this.prisma.solicitudAfiliacion.update({
      where: { id: solicitudId },
      data: { estado: 'RECHAZADO', motivo, resuelto_por: 0 },
    });

    const socio = await this.prisma.usuario.findUnique({
      where: { id: solicitud.usuario_id },
      select: { nombre: true, apellido: true },
    });
    if (socio) {
      const nombreSocio = `${socio.nombre} ${socio.apellido}`;
      await this.enviarAAdminsAsociacion(solicitud.asociacion_id, (admin) =>
        this.notificaciones.sendBajaRechazadaAsociacion(
          admin.email,
          admin.nombre,
          nombreSocio,
        ),
      );
    }

    return this.prisma.solicitudAfiliacion.findUnique({
      where: { id: solicitudId },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            dni: true,
            email: true,
          },
        },
      },
    });
  }

  async listarDesafiliados() {
    return this.prisma.usuario.findMany({
      where: { estado_reg: EstadoRegistro.DESAFILIADO },
      include: { asociacion: { select: { id: true, nombre: true } } },
      orderBy: { apellido: 'asc' },
    });
  }

  async bajasAsociacion(admin: AuthUser) {
    return this.prisma.solicitudAfiliacion.findMany({
      where: {
        asociacion_id: admin.asociacion_id,
        tipo: { in: ['BAJA_ASOCIACION', 'BAJA_SOCIO'] },
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            dni: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async solicitarAlta(user: AuthUser, dto: SolicitarAltaDto) {
    const socio = await this.prisma.usuario.findUnique({
      where: { id: user.id },
    });
    if (!socio) throw new NotFoundException('Usuario no encontrado');
    if (socio.estado_reg !== EstadoRegistro.DESAFILIADO) {
      throw new BadRequestException(
        'Solo un usuario desafiliado puede solicitar su afiliación',
      );
    }
    const asociacion = await this.prisma.asociacion.findUnique({
      where: { id: dto.asociacion_id },
    });
    if (!asociacion) {
      throw new BadRequestException('La asociación seleccionada no existe');
    }
    await this.verificarDojoEnAsociacion(dto.dojo_id, dto.asociacion_id);

    const solicitud = await this.prisma.solicitudAfiliacion.create({
      data: {
        tipo: 'ALTA_SOCIO',
        usuario_id: socio.id,
        estado: 'PENDIENTE',
        asociacion_id: dto.asociacion_id,
        dojo_id: dto.dojo_id,
        motivo: dto.motivo,
      },
    });

    const nombreSocio = `${socio.nombre} ${socio.apellido}`;
    await this.enviarAAdminsAsociacion(dto.asociacion_id, (admin) =>
      this.notificaciones.sendAltaSolicitadaAsociacion(
        admin.email,
        admin.nombre,
        nombreSocio,
      ),
    );

    return solicitud;
  }

  async pendientesAlta(admin: AuthUser) {
    return this.prisma.solicitudAfiliacion.findMany({
      where: {
        tipo: 'ALTA_SOCIO',
        estado: 'PENDIENTE',
        asociacion_id: admin.asociacion_id,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            dni: true,
            email: true,
          },
        },
        dojo: { select: { id: true, nombre: true } },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async aprobarAlta(solicitudId: number, admin: AuthUser) {
    const solicitud = await this.prisma.solicitudAfiliacion.findUnique({
      where: { id: solicitudId },
      include: {
        usuario: { select: { email: true, nombre: true, apellido: true } },
      },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.tipo !== 'ALTA_SOCIO') {
      throw new BadRequestException('La solicitud no corresponde a un alta');
    }
    if (!solicitud.asociacion_id || !solicitud.dojo_id) {
      throw new BadRequestException(
        'La solicitud no tiene datos de destino válidos',
      );
    }
    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException('La solicitud ya fue resuelta');
    }
    if (solicitud.asociacion_id !== admin.asociacion_id) {
      throw new ForbiddenException('No puede aprobar altas de otra asociación');
    }

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: solicitud.usuario_id },
        data: {
          asociacion_id: solicitud.asociacion_id,
          dojo_id: solicitud.dojo_id,
          estado_reg: EstadoRegistro.APROBADO,
        },
      }),
      this.prisma.solicitudAfiliacion.update({
        where: { id: solicitudId },
        data: { estado: 'APROBADO', resuelto_por: admin.id },
      }),
    ]);

    const nombreSocio = `${solicitud.usuario.nombre} ${solicitud.usuario.apellido}`;
    const asociacionNombre = await this.getAsociacionNombre(
      solicitud.asociacion_id,
    );
    await this.notificaciones
      .sendAltaConfirmadaSocio(
        solicitud.usuario.email,
        solicitud.usuario.nombre,
        asociacionNombre,
      )
      .catch((err) =>
        this.logger.warn(
          err,
          'Error al enviar email a %s',
          solicitud.usuario.email,
        ),
      );
    await this.enviarAFederacion((email) =>
      this.notificaciones.sendAltaInformadaFederacion(
        email,
        nombreSocio,
        asociacionNombre,
      ),
    );

    return this.prisma.solicitudAfiliacion.findUnique({
      where: { id: solicitudId },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            dni: true,
            email: true,
          },
        },
      },
    });
  }

  async rechazarAlta(solicitudId: number, admin: AuthUser, motivo?: string) {
    const solicitud = await this.prisma.solicitudAfiliacion.findUnique({
      where: { id: solicitudId },
      include: {
        usuario: { select: { email: true, nombre: true, apellido: true } },
      },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.tipo !== 'ALTA_SOCIO') {
      throw new BadRequestException('La solicitud no corresponde a un alta');
    }
    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException('La solicitud ya fue resuelta');
    }
    if (solicitud.asociacion_id !== admin.asociacion_id) {
      throw new ForbiddenException(
        'No puede rechazar altas de otra asociación',
      );
    }

    await this.prisma.solicitudAfiliacion.update({
      where: { id: solicitudId },
      data: { estado: 'RECHAZADO', motivo, resuelto_por: admin.id },
    });

    await this.notificaciones
      .sendAltaRechazadaSocio(
        solicitud.usuario.email,
        solicitud.usuario.nombre,
        motivo ??
          'Si considera que esto es un error, contacte al administrador de la asociación.',
      )
      .catch((err) =>
        this.logger.warn(
          err,
          'Error al enviar email a %s',
          solicitud.usuario.email,
        ),
      );

    return this.prisma.solicitudAfiliacion.findUnique({
      where: { id: solicitudId },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            dni: true,
            email: true,
          },
        },
      },
    });
  }

  async altaDirecta(admin: AuthUser, usuarioId: number, dto: AltaDirectaDto) {
    const socio = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!socio) throw new NotFoundException('Usuario no encontrado');
    if (socio.estado_reg !== EstadoRegistro.DESAFILIADO) {
      throw new BadRequestException('El usuario no está desafiliado');
    }
    await this.verificarDojoEnAsociacion(dto.dojo_id, admin.asociacion_id);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuarioId },
        data: {
          asociacion_id: admin.asociacion_id,
          dojo_id: dto.dojo_id,
          estado_reg: EstadoRegistro.APROBADO,
        },
      }),
      this.prisma.solicitudAfiliacion.create({
        data: {
          tipo: 'ALTA_ASOCIACION',
          usuario_id: usuarioId,
          estado: 'APROBADO',
          asociacion_id: admin.asociacion_id,
          dojo_id: dto.dojo_id,
          motivo: dto.motivo,
          resuelto_por: admin.id,
        },
      }),
    ]);

    const nombreSocio = `${socio.nombre} ${socio.apellido}`;
    const asociacionNombre = await this.getAsociacionNombre(
      admin.asociacion_id,
    );
    await this.notificaciones
      .sendAltaConfirmadaSocio(socio.email, socio.nombre, asociacionNombre)
      .catch((err) =>
        this.logger.warn(err, 'Error al enviar email a %s', socio.email),
      );
    await this.enviarAFederacion((email) =>
      this.notificaciones.sendAltaInformadaFederacion(
        email,
        nombreSocio,
        asociacionNombre,
      ),
    );

    return { mensaje: 'Alta registrada correctamente' };
  }

  async misSolicitudes(user: AuthUser) {
    return this.prisma.solicitudAfiliacion.findMany({
      where: { usuario_id: user.id },
      include: {
        asociacion: { select: { id: true, nombre: true } },
        dojo: { select: { id: true, nombre: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getConfig() {
    const config = await this.prisma.configSistema.findFirst({
      select: { fak_email: true },
    });
    return { fak_email: config?.fak_email ?? null };
  }

  async updateConfig(fakEmail: string | null) {
    const existing = await this.prisma.configSistema.findFirst();
    if (existing) {
      return this.prisma.configSistema.update({
        where: { id: existing.id },
        data: { fak_email: fakEmail },
        select: { fak_email: true },
      });
    }
    return this.prisma.configSistema.create({
      data: { fak_email: fakEmail },
      select: { fak_email: true },
    });
  }
}
