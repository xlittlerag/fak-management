import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { PreciosExamenService } from './precios-examen.service';
import { CreatePrecioExamenDto } from './dto/create-precio-examen.dto';
import { UpdatePrecioExamenDto } from './dto/update-precio-examen.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Rol } from '@prisma/client';

@Controller('precios-examen')
export class PreciosExamenController {
  constructor(private readonly preciosExamenService: PreciosExamenService) {}

  @Public()
  @Get()
  findAll() {
    return this.preciosExamenService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.preciosExamenService.findOne(id);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post()
  create(@Body() dto: CreatePrecioExamenDto) {
    return this.preciosExamenService.create(dto);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePrecioExamenDto) {
    return this.preciosExamenService.update(id, dto);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.preciosExamenService.remove(id);
  }
}
