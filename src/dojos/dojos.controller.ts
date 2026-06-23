import { Controller, Get, Post, Body, Param, ParseIntPipe, Patch, Delete, BadRequestException } from '@nestjs/common';
import { DojosService } from './dojos.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDojoDto } from './dto/create-dojo.dto';
import { UpdateDojoDto } from './dto/update-dojo.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Rol } from '@prisma/client';

@Controller('dojos')
export class DojosController {
  constructor(
    private readonly dojosService: DojosService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('asociacion/:asociacion_id')
  findAllByAsociacion(@Param('asociacion_id', ParseIntPipe) asociacion_id: number) {
    return this.dojosService.findAllByAsociacion(asociacion_id);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post()
  async create(@Body() dto: CreateDojoDto) {
    const asociacion_id = Number(dto.asociacion_id);
    
    const asociacion = await this.prisma.asociacion.findUnique({ where: { id: asociacion_id } });
    if (!asociacion) {
        throw new BadRequestException(`Association with ID ${asociacion_id} not found.`);
    }

    return this.dojosService.create({
      ...dto,
      asociacion_id,
    });
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDojoDto) {
    return this.dojosService.update(id, dto);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.dojosService.remove(id);
  }
}
