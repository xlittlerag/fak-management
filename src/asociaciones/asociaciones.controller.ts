import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { AsociacionesService } from './asociaciones.service';
import { CreateAsociacionDto } from './dto/create-asociacion.dto';
import { UpdateAsociacionDto } from './dto/update-asociacion.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('asociaciones')
export class AsociacionesController {
  constructor(private readonly asociacionesService: AsociacionesService) {}

  @Public()
  @Get()
  findAll() {
    return this.asociacionesService.findAll();
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post()
  create(@Body() createAsociacionDto: CreateAsociacionDto) {
    return this.asociacionesService.create(createAsociacionDto);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateAsociacionDto: UpdateAsociacionDto) {
    return this.asociacionesService.update(id, updateAsociacionDto);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.asociacionesService.remove(id);
  }
}
