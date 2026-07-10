import { Controller, Get, Post, Patch, Body, Param, Req, ParseIntPipe, Query, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { DiplomasService } from './diplomas.service';
import { CreateDiplomaDto } from './dto/create-diploma.dto';
import { CreateDiplomaLoteDto } from './dto/create-diploma.dto';
import { ReimprimirDto } from './dto/reimprimir.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';
import type { Request } from 'express';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller()
export class DiplomasController {
  constructor(private readonly diplomasService: DiplomasService) {}

  @Roles(Rol.ADMIN_GENERAL)
  @Post('admin/diplomas')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDiplomaDto,
  ) {
    return this.diplomasService.create(file, dto);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post('admin/diplomas/lote')
  @UseInterceptors(FilesInterceptor('files', 50, { limits: { fileSize: MAX_FILE_SIZE } }))
  createLote(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('evento_id') evento_id: string,
    @Body('archivos_meta') archivosMeta: string,
  ) {
    return this.diplomasService.createLote(parseInt(evento_id), files, archivosMeta);
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
