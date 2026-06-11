import { Controller, Get, Patch, Param, Body, Request, ParseIntPipe } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UpdateAprobacionDto } from './dto/update-aprobacion.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Roles(Rol.ADMIN_ASOCIACION, Rol.ADMIN_GENERAL)
  @Get('pendientes')
  findPendientes(@Request() req: any) {
    return this.usuariosService.findPendientes(req.user);
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
