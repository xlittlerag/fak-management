import { Injectable } from '@nestjs/common';
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

  update(id: number, dto: UpdateAsociacionDto) {
    return this.prisma.asociacion.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: number) {
    return this.prisma.asociacion.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
