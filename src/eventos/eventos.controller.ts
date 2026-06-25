import { Controller, Get, Post, Patch, Delete, Body, Param, Request, ParseIntPipe, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { InscribirEventoDto } from './dto/inscribir-evento.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Rol } from '@prisma/client';

@Controller()
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Roles(Rol.ADMIN_GENERAL)
  @Post('eventos')
  create(@Body() dto: CreateEventoDto) {
    return this.eventosService.create(dto);
  }

  @Public()
  @Get('eventos')
  findAll(@Query('all') all?: string) {
    const incluirBorradores = all === 'true';
    return this.eventosService.findAll(incluirBorradores);
  }

  @Public()
  @Get('eventos/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.findOne(id);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Patch('eventos/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventoDto) {
    return this.eventosService.update(id, dto);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Patch('eventos/:id/publicar')
  publicar(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.publicar(id);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Delete('eventos/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.remove(id);
  }

  @Post('eventos/:id/inscribir')
  @HttpCode(HttpStatus.OK)
  inscribir(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() dto?: InscribirEventoDto,
  ) {
    return this.eventosService.inscribir(id, req.user.id, dto);
  }

  @Roles(Rol.ADMIN_ASOCIACION, Rol.ADMIN_GENERAL)
  @Get('eventos/:id/inscripciones')
  findInscripciones(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.findInscripciones(id);
  }

  @Get('mis-inscripciones')
  misInscripciones(@Request() req: any) {
    return this.eventosService.findMisInscripciones(req.user.id);
  }

  @Roles(Rol.ADMIN_ASOCIACION, Rol.ADMIN_GENERAL)
  @Patch('inscripciones/:id/aprobar')
  aprobarInscripcion(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body('accion') accion: 'APROBAR' | 'RECHAZAR',
  ) {
    return this.eventosService.aprobarInscripcion(id, req.user, accion);
  }

  @Post('inscripciones/:id/pagar')
  @HttpCode(HttpStatus.OK)
  pagarInscripcion(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.eventosService.pagarInscripcion(id, req.user.id);
  }
}
