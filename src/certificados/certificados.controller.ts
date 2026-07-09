import { Controller, Get, Post, Patch, Body, Param, Req, ParseIntPipe } from '@nestjs/common';
import { CertificadosService } from './certificados.service';
import { CreateCertificadoDto } from './dto/create-certificado.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';
import type { Request } from 'express';

@Controller()
export class CertificadosController {
  constructor(private readonly certificadosService: CertificadosService) {}

  @Post('certificados')
  create(@Body() dto: CreateCertificadoDto, @Req() req: Request) {
    return this.certificadosService.create(dto, req.user!);
  }

  @Get('certificados')
  findAll(@Req() req: Request) {
    return this.certificadosService.findAll(req.user!);
  }

  @Roles(Rol.ADMIN_ASOCIACION)
  @Patch('certificados/:id/aprobar-asociacion')
  aprobarAsociacion(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.certificadosService.aprobarAsociacion(id, req.user!);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Patch('certificados/:id/aprobar-general')
  aprobarGeneral(@Param('id', ParseIntPipe) id: number) {
    return this.certificadosService.aprobarGeneral(id);
  }

  @Roles(Rol.ADMIN_ASOCIACION, Rol.ADMIN_GENERAL)
  @Patch('certificados/:id/rechazar')
  rechazar(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.certificadosService.rechazar(id, req.user!);
  }
}
