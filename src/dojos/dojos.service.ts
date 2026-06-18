import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDojoDto } from './dto/create-dojo.dto';

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
}
