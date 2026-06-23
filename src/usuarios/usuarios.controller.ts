import { Controller, Get, Patch, Param, Body, Request, ParseIntPipe, Query } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UpdateAprobacionDto } from './dto/update-aprobacion.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Roles(Rol.ADMIN_ASOCIACION, Rol.ADMIN_GENERAL)
  @Get()
  findAll(
    @Request() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.usuariosService.findAll(req.user, { skip: skip ? Number(skip) : undefined, take: take ? Number(take) : undefined });
  }

  @Get('perfil')
  getPerfil(@Request() req: any) {
    return this.usuariosService.findOne(req.user.id);
  }

  @Get('cuota')
  getCuota(@Request() req: any) {
    return this.usuariosService.getCuota(req.user.id);
  }

  @Patch('perfil')
  updatePerfil(@Request() req: any, @Body() dto: UpdatePerfilDto) {
    return this.usuariosService.updatePerfil(req.user.id, dto);
  }

  @Roles(Rol.ADMIN_ASOCIACION, Rol.ADMIN_GENERAL)
  @Get('pendientes')
  findPendientes(@Request() req: any) {
    return this.usuariosService.findPendientes(req.user);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Patch(':id/rol')
  updateRol(
    @Param('id', ParseIntPipe) id: number,
    @Body('rol') rol: Rol,
  ) {
    return this.usuariosService.updateRol(id, rol);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Patch(':id/graduacion')
  updateGraduacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.usuariosService.updateGraduacion(id, dto);
  }

  @Roles(Rol.ADMIN_ASOCIACION, Rol.ADMIN_GENERAL)
  @Patch(':id/aprobacion')
  updateAprobacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAprobacionDto,
    @Request() req: any,
  ) {
    return this.usuariosService.updateAprobacion(id, dto, req.user);
  }
}
