import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { AfiliacionesService } from './afiliaciones.service';
import { AltaDirectaDto } from './dto/alta-directa.dto';
import { ConfigFakEmailDto } from './dto/config-fak-email.dto';
import { MotivoDto } from './dto/motivo.dto';
import { SolicitarAltaDto } from './dto/solicitar-alta.dto';

@Controller('afiliaciones')
export class AfiliacionesController {
  constructor(private afiliacionesService: AfiliacionesService) {}

  @Post('baja')
  solicitarBajaPropia(@Req() req: { user: AuthUser }, @Body() dto: MotivoDto) {
    return this.afiliacionesService.solicitarBajaPropia(req.user, dto.motivo);
  }

  @Roles(Rol.ADMIN_ASOCIACION)
  @Post('baja/:usuarioId')
  solicitarBajaAsociacion(
    @Req() req: { user: AuthUser },
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: MotivoDto,
  ) {
    return this.afiliacionesService.solicitarBajaAsociacion(
      req.user,
      usuarioId,
      dto.motivo,
    );
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Get('pendientes-baja')
  pendientesBaja() {
    return this.afiliacionesService.pendientesBaja();
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Patch('baja/:id/aprobar')
  aprobarBaja(@Param('id', ParseIntPipe) id: number) {
    return this.afiliacionesService.aprobarBaja(id);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Patch('baja/:id/rechazar')
  rechazarBaja(@Param('id', ParseIntPipe) id: number, @Body() dto: MotivoDto) {
    return this.afiliacionesService.rechazarBaja(id, dto.motivo);
  }

  @Roles(Rol.ADMIN_ASOCIACION, Rol.ADMIN_GENERAL)
  @Get('desafiliados')
  listarDesafiliados() {
    return this.afiliacionesService.listarDesafiliados();
  }

  @Roles(Rol.ADMIN_ASOCIACION)
  @Get('bajas')
  bajasAsociacion(@Req() req: { user: AuthUser }) {
    return this.afiliacionesService.bajasAsociacion(req.user);
  }

  @Roles(Rol.ADMIN_ASOCIACION)
  @Post('alta/:usuarioId')
  altaDirecta(
    @Req() req: { user: AuthUser },
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: AltaDirectaDto,
  ) {
    return this.afiliacionesService.altaDirecta(req.user, usuarioId, dto);
  }

  @Post('alta')
  solicitarAlta(@Req() req: { user: AuthUser }, @Body() dto: SolicitarAltaDto) {
    return this.afiliacionesService.solicitarAlta(req.user, dto);
  }

  @Roles(Rol.ADMIN_ASOCIACION)
  @Get('pendientes-alta')
  pendientesAlta(@Req() req: { user: AuthUser }) {
    return this.afiliacionesService.pendientesAlta(req.user);
  }

  @Roles(Rol.ADMIN_ASOCIACION)
  @Patch('alta/:id/aprobar')
  aprobarAlta(
    @Req() req: { user: AuthUser },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.afiliacionesService.aprobarAlta(id, req.user);
  }

  @Roles(Rol.ADMIN_ASOCIACION)
  @Patch('alta/:id/rechazar')
  rechazarAlta(
    @Req() req: { user: AuthUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MotivoDto,
  ) {
    return this.afiliacionesService.rechazarAlta(id, req.user, dto.motivo);
  }

  @Get('mis-solicitudes')
  misSolicitudes(@Req() req: { user: AuthUser }) {
    return this.afiliacionesService.misSolicitudes(req.user);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Get('config')
  getConfig() {
    return this.afiliacionesService.getConfig();
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Patch('config')
  updateConfig(@Body() dto: ConfigFakEmailDto) {
    return this.afiliacionesService.updateConfig(dto.fak_email ?? null);
  }
}
