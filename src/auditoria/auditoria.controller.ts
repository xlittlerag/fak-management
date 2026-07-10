import { Controller, Get, Param, Query, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('admin/auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Roles(Rol.ADMIN_GENERAL)
  @Get()
  findAll(
    @Query('entidad') entidad?: string,
    @Query('usuario_id') usuario_id?: string,
    @Query('accion') accion?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.auditoriaService.findAll({
      entidad,
      usuario_id: usuario_id ? parseInt(usuario_id, 10) : undefined,
      accion,
      desde,
      hasta,
      pagina: pagina ? parseInt(pagina, 10) : undefined,
      limite: limite ? parseInt(limite, 10) : undefined,
    });
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const entry = await this.auditoriaService.findOne(id);
    if (!entry) {
      throw new NotFoundException('Entrada de auditoría no encontrada.');
    }
    return entry;
  }
}
