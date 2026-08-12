import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { MesasService } from './mesas.service';
import { CreateMesaDto } from './dto/create-mesa.dto';
import { UpdateMesaDto } from './dto/update-mesa.dto';
import { CargarResultadoDto } from './dto/cargar-resultado.dto';
import { CargarAvanceDto } from './dto/cargar-avance.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';
import type { Request } from 'express';

@Controller('admin')
export class MesasController {
  constructor(private readonly mesasService: MesasService) {}

  @Roles(Rol.ADMIN_GENERAL)
  @Post('eventos/:id/mesas')
  createMesa(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMesaDto,
    @Req() req: Request,
  ) {
    return this.mesasService.createMesa(id, dto, req.user!);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Get('eventos/:id/mesas')
  findMesas(@Param('id', ParseIntPipe) id: number) {
    return this.mesasService.findMesas(id);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Patch('mesas/:id')
  updateMesa(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMesaDto,
    @Req() req: Request,
  ) {
    return this.mesasService.updateMesa(id, dto, req.user!);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Delete('mesas/:id')
  deleteMesa(@Param('id', ParseIntPipe) id: number) {
    return this.mesasService.deleteMesa(id);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Get('examenes/:id/resultados')
  findResultados(@Param('id', ParseIntPipe) id: number) {
    return this.mesasService.findResultados(id);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post('resultados')
  cargarResultado(@Body() dto: CargarResultadoDto, @Req() req: Request) {
    return this.mesasService.cargarResultado(dto, req.user!);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post('resultados/avance')
  cargarAvance(@Body() dto: CargarAvanceDto, @Req() req: Request) {
    return this.mesasService.cargarAvance(dto, req.user!);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post('inscripciones/:id/registro-pagado')
  registrarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarPagoDto,
    @Req() req: Request,
  ) {
    return this.mesasService.registrarPago(id, dto.disciplina, req.user!);
  }
}
