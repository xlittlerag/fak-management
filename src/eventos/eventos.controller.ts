import { Controller, Get, Post, Patch, Delete, Body, Param, Req, ParseIntPipe, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { InscribirEventoDto } from './dto/inscribir-evento.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Rol } from '@prisma/client';
import type { Request } from 'express';

@Controller()
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Roles(Rol.ADMIN_GENERAL, Rol.ADMIN_ASOCIACION)
  @Post('eventos')
  create(@Body() dto: CreateEventoDto, @Req() req: Request) {
    return this.eventosService.create(dto, req.user!);
  }

  @Public()
  @Get('eventos')
  findAll() {
    return this.eventosService.findAll(false);
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ADMIN_ASOCIACION)
  @Get('eventos/admin')
  findAllAdmin(@Req() req: Request) {
    return this.eventosService.findAllAdmin(req.user!);
  }

  @Public()
  @Get('eventos/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.findOne(id);
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ADMIN_ASOCIACION)
  @Patch('eventos/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventoDto, @Req() req: Request) {
    return this.eventosService.update(id, dto, req.user!);
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ADMIN_ASOCIACION)
  @Patch('eventos/:id/publicar')
  publicar(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.eventosService.publicar(id, req.user!);
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ADMIN_ASOCIACION)
  @Delete('eventos/:id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.eventosService.remove(id, req.user!);
  }

  @Post('eventos/:id/inscribir')
  @HttpCode(HttpStatus.OK)
  inscribir(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Body() dto?: InscribirEventoDto,
  ) {
    return this.eventosService.inscribir(id, req.user!.id, dto);
  }

  @Roles(Rol.ADMIN_ASOCIACION, Rol.ADMIN_GENERAL)
  @Get('eventos/:id/inscripciones')
  findInscripciones(@Param('id', ParseIntPipe) id: number, @Query('aprobados') aprobados?: string) {
    return this.eventosService.findInscripciones(id, aprobados === 'true');
  }

  @Get('mis-inscripciones')
  misInscripciones(@Req() req: Request) {
    return this.eventosService.findMisInscripciones(req.user!.id);
  }

  @Roles(Rol.ADMIN_ASOCIACION, Rol.ADMIN_GENERAL)
  @Patch('inscripciones/:id/aprobar')
  aprobarInscripcion(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Body('accion') accion: 'APROBAR' | 'RECHAZAR',
  ) {
    return this.eventosService.aprobarInscripcion(id, req.user!, accion);
  }

  @Post('inscripciones/:id/pagar')
  @HttpCode(HttpStatus.OK)
  pagarInscripcion(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.eventosService.pagarInscripcion(id, req.user!.id);
  }

  @Patch('inscripciones/:id')
  editarInscripcion(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Body() dto: InscribirEventoDto,
  ) {
    return this.eventosService.editarInscripcion(id, req.user!.id, dto);
  }

  @Delete('inscripciones/:id')
  @HttpCode(HttpStatus.OK)
  bajaInscripcion(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.eventosService.bajaInscripcion(id, req.user!.id);
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ADMIN_ASOCIACION)
  @Post('inscripciones/:id/pago-manual')
  @HttpCode(HttpStatus.OK)
  pagoManual(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.eventosService.pagoManual(id, req.user!);
  }

  @Roles(Rol.ADMIN_GENERAL, Rol.ADMIN_ASOCIACION)
  @Post('eventos/:id/cerrar-inscripciones')
  @HttpCode(HttpStatus.OK)
  cerrarInscripciones(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.eventosService.cerrarInscripciones(id, req.user!);
  }
}
