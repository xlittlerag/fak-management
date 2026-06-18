import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { DojosService } from './dojos.service';
import { CreateDojoDto } from './dto/create-dojo.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('dojos')
export class DojosController {
  constructor(private readonly dojosService: DojosService) {}

  @Get('asociacion/:asociacion_id')
  findAllByAsociacion(@Param('asociacion_id', ParseIntPipe) asociacion_id: number) {
    return this.dojosService.findAllByAsociacion(asociacion_id);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post()
  create(@Body() dto: CreateDojoDto) {
    return this.dojosService.create(dto);
  }
}
