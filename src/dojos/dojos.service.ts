import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDojoDto } from './dto/create-dojo.dto';
import { UpdateDojoDto } from './dto/update-dojo.dto';

@Injectable()
export class DojosService {
  constructor(private prisma: PrismaService) {}

  findAllByAsociacion(asociacion_id: number) {
    return this.prisma.dojo.findMany({
      where: { asociacion_id },
    });
  }

  create(dto: CreateDojoDto) {
    const { id, ...dataToCreate } = dto as any;
    return this.prisma.dojo.create({
      data: dataToCreate,
    });
  }

  update(id: number, dto: UpdateDojoDto) {
    return this.prisma.dojo.update({
      where: { id },
      data: dto,
    });
  }
async remove(id: number) {
  const dojo = await this.prisma.dojo.findUnique({
    where: { id },
    include: { usuarios: true },
  });

  if (dojo && dojo.usuarios && dojo.usuarios.length > 0) {
    throw new BadRequestException('No se puede eliminar un dojo que tiene practicantes asignados.');
  }

  if (!dojo) {
    throw new NotFoundException('Dojo no encontrado.');
  }

  return this.prisma.dojo.delete({
    where: { id },
  });
}

}

