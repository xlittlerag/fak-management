import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrecioExamenDto } from './dto/create-precio-examen.dto';
import { UpdatePrecioExamenDto } from './dto/update-precio-examen.dto';

@Injectable()
export class PreciosExamenService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.precioExamen.findMany({
      orderBy: { graduacion: 'asc' },
    });
  }

  async findOne(id: number) {
    const precio = await this.prisma.precioExamen.findUnique({ where: { id } });
    if (!precio) throw new NotFoundException('Precio de examen no encontrado');
    return precio;
  }

  async findByGraduacion(graduacion: string) {
    const precio = await this.prisma.precioExamen.findUnique({ where: { graduacion } });
    if (!precio) throw new NotFoundException(`No hay precio configurado para la graduación ${graduacion}`);
    return precio;
  }

  async create(dto: CreatePrecioExamenDto) {
    const existing = await this.prisma.precioExamen.findUnique({
      where: { graduacion: dto.graduacion },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un precio para la graduación ${dto.graduacion}`);
    }
    return this.prisma.precioExamen.create({ data: dto });
  }

  async update(id: number, dto: UpdatePrecioExamenDto) {
    await this.findOne(id);
    return this.prisma.precioExamen.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.precioExamen.delete({ where: { id } });
    return { eliminado: true };
  }
}
