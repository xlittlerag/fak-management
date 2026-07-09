import { Controller, Get, Post, Patch, Body, Param, Req, ParseIntPipe, Query } from '@nestjs/common';
import { DiplomasService } from './diplomas.service';
import { CreateDiplomaDto } from './dto/create-diploma.dto';
import { CreateDiplomaLoteDto } from './dto/create-diploma.dto';
import { ReimprimirDto } from './dto/reimprimir.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';
import type { Request } from 'express';

@Controller()
export class DiplomasController {
  constructor(private readonly diplomasService: DiplomasService) {}

  @Roles(Rol.ADMIN_GENERAL)
  @Post('admin/diplomas')
  create(@Body() dto: CreateDiplomaDto) {
    return this.diplomasService.create(dto);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post('admin/diplomas/lote')
  createLote(@Body() dto: CreateDiplomaLoteDto) {
    return this.diplomasService.createLote(dto, dto.archivos);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Get('admin/diplomas')
  findAll(@Query('usuario_id') usuario_id?: string) {
    return this.diplomasService.findAll(usuario_id ? parseInt(usuario_id) : undefined);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Get('admin/diploma/config')
  getConfig() {
    return this.diplomasService.getConfig();
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Patch('admin/diploma/config')
  updateConfig(@Body() dto: UpdateConfigDto) {
    return this.diplomasService.updateConfig(dto);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Get('admin/diploma/reimpresiones')
  findReimpresiones() {
    return this.diplomasService.findReimpresiones();
  }

  @Get('mis-diplomas')
  findMisDiplomas(@Req() req: Request) {
    return this.diplomasService.findMisDiplomas(req.user!.id);
  }

  @Post('diplomas/reimprimir')
  reimprimir(@Body() dto: ReimprimirDto, @Req() req: Request) {
    return this.diplomasService.reimprimir(dto, req.user!);
  }
}
