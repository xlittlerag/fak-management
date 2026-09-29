import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { multerOptions, MAX_FILE_SIZE } from '../files/multer-options';
import { DiplomasService } from './diplomas.service';
import { CreateDiplomaDto } from './dto/create-diploma.dto';
import { CreateLoteDto } from './dto/create-lote.dto';
import { ReimprimirDto } from './dto/reimprimir.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';
import type { Request } from 'express';

// Tope del lote: con diskStorage el costo es disco, pero 20 archivos por
// request ya cubren el caso de uso sin castigar el proceso.
const LOTE_MAX_COUNT = 20;

@Controller()
export class DiplomasController {
  constructor(private readonly diplomasService: DiplomasService) {}

  @Roles(Rol.ADMIN_GENERAL)
  @Post('admin/diplomas')
  @UseInterceptors(
    FileInterceptor('file', {
      ...multerOptions(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDiplomaDto,
  ) {
    return this.diplomasService.create(file, dto);
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Post('admin/diplomas/lote')
  @UseInterceptors(
    FilesInterceptor('files', LOTE_MAX_COUNT, {
      ...multerOptions(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  createLote(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateLoteDto,
  ) {
    return this.diplomasService.createLote(
      dto.evento_id,
      files,
      dto.archivos_meta,
    );
  }

  @Roles(Rol.ADMIN_GENERAL)
  @Get('admin/diplomas')
  findAll(@Query('usuario_id') usuario_id?: string) {
    return this.diplomasService.findAll(
      usuario_id ? parseInt(usuario_id) : undefined,
    );
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
