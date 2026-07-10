import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoSolicitud, Prisma } from '@prisma/client';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateCertificadoDto } from './dto/create-certificado.dto';
import { FilesService } from '../files/files.service';

@Injectable()
export class CertificadosService {
  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
  ) {}

  async create(file: Express.Multer.File, dto: CreateCertificadoDto, user: AuthUser) {
    const url_archivo = await this.filesService.upload(file);
    return this.prisma.certificadoExterno.create({
      data: {
        usuario_id: user.id,
        url_archivo,
        disciplina: dto.disciplina as any,
        grad_solicitada: dto.grad_solicitada as any,
        estado: 'PENDIENTE',
      },
      select: {
        id: true,
        url_archivo: true,
        disciplina: true,
        grad_solicitada: true,
        estado: true,
        created_at: true,
      },
    });
  }

  async findAll(user: AuthUser) {
    const where: Prisma.CertificadoExternoWhereInput = {};
    if (user.rol === 'BASICO') {
      where.usuario_id = user.id;
    } else if (user.rol === 'ADMIN_ASOCIACION') {
      where.usuario = { asociacion_id: user.asociacion_id };
    }
    return this.prisma.certificadoExterno.findMany({
      where,
      include: {
        usuario: {
          select: { id: true, nombre: true, apellido: true, dni: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async aprobarAsociacion(id: number, user: AuthUser) {
    const cert = await this.prisma.certificadoExterno.findUnique({
      where: { id },
      include: { usuario: { select: { asociacion_id: true } } },
    });
    if (!cert) throw new NotFoundException('Certificación no encontrada');
    if (cert.estado !== 'PENDIENTE') throw new BadRequestException('La certificación no está pendiente');
    if (user.rol === 'ADMIN_ASOCIACION' && cert.usuario.asociacion_id !== user.asociacion_id) {
      throw new ForbiddenException('No puede aprobar certificaciones de otra asociación');
    }
    return this.prisma.certificadoExterno.update({
      where: { id },
      data: { estado: 'APROBADO_ASOCIACION' as EstadoSolicitud },
    });
  }

  async aprobarGeneral(id: number) {
    const cert = await this.prisma.certificadoExterno.findUnique({
      where: { id },
    });
    if (!cert) throw new NotFoundException('Certificación no encontrada');
    if (cert.estado !== 'APROBADO_ASOCIACION') {
      throw new BadRequestException('La certificación debe ser aprobada por la asociación primero');
    }

    const disciplina = cert.disciplina as string;
    const field = `grad_${disciplina.toLowerCase()}` as 'grad_kendo' | 'grad_iaido' | 'grad_jodo';
    const dateField = `f_grad_${disciplina.toLowerCase()}` as 'f_grad_kendo' | 'f_grad_iaido' | 'f_grad_jodo';

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.certificadoExterno.update({
        where: { id },
        data: { estado: 'APROBADO' as EstadoSolicitud },
      });
      await tx.usuario.update({
        where: { id: cert.usuario_id },
        data: {
          [field]: cert.grad_solicitada,
          [dateField]: new Date(),
        },
      });
      await tx.historialGraduacion.create({
        data: {
          usuario_id: cert.usuario_id,
          disciplina: cert.disciplina,
          graduacion: cert.grad_solicitada,
          fecha_obtencion: new Date(),
          otorgado_por: `Certificación externa #${cert.id}`,
        },
      });
      return updated;
    });
  }

  async rechazar(id: number, user: AuthUser) {
    const cert = await this.prisma.certificadoExterno.findUnique({
      where: { id },
      include: { usuario: { select: { asociacion_id: true } } },
    });
    if (!cert) throw new NotFoundException('Certificación no encontrada');
    if (cert.estado === 'APROBADO') throw new BadRequestException('La certificación ya fue aprobada');
    if (user.rol === 'ADMIN_ASOCIACION' && cert.usuario.asociacion_id !== user.asociacion_id) {
      throw new ForbiddenException('No puede rechazar certificaciones de otra asociación');
    }
    return this.prisma.certificadoExterno.update({
      where: { id },
      data: { estado: 'RECHAZADO' as EstadoSolicitud },
    });
  }
}
