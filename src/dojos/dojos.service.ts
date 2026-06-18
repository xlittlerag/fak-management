import { Injectable } from '@nestjs/common';
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
    return this.prisma.dojo.create({
      data: dto,
    });
  }

  update(id: number, dto: UpdateDojoDto) {
    return this.prisma.dojo.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: number) {
    return this.prisma.dojo.delete({
      where: { id },
    });
  }
}
