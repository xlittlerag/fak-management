import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAsociacionDto } from './dto/create-asociacion.dto';
import { UpdateAsociacionDto } from './dto/update-asociacion.dto';

@Injectable()
export class AsociacionesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.asociacion.findMany({
      where: { 
        deleted_at: null,
      },
    });
  }

  create(dto: CreateAsociacionDto) {
    return this.prisma.asociacion.create({ data: dto });
  }

  async update(id: number, dto: UpdateAsociacionDto) {
    const assoc = await this.prisma.asociacion.findUnique({ where: { id } });
    if (!assoc) {
      throw new NotFoundException('Asociación no encontrada.');
    }

    return this.prisma.asociacion.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    const assoc = await this.prisma.asociacion.findUnique({ where: { id } });
    if (!assoc) {
      throw new NotFoundException('Asociación no encontrada.');
    }

    const dojoCount = await this.prisma.dojo.count({
      where: { asociacion_id: id, deleted_at: null },
    });

    if (dojoCount > 0) {
      throw new BadRequestException('No se puede eliminar una asociación que tiene dojos activos.');
    }

    return this.prisma.asociacion.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
