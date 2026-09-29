import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import { Public } from '../auth/decorators/public.decorator';

// Solo archivos generados por FilesService: uuid + extensión de imagen/pdf.
// Insensible a mayúsculas y con jpeg por compatibilidad con archivos viejos.
const FILENAME_ALLOWLIST = /^[0-9a-f-]{36}\.(jpg|jpeg|png|pdf)$/i;

@Controller('uploads')
export class UploadsController {
  @Get(':filename')
  @Public()
  serve(@Param('filename') filename: string, @Res() res: Response) {
    // Allowlist estricta + basename: cierra path traversal y fija el tipo.
    const seguro = basename(filename);
    if (!FILENAME_ALLOWLIST.test(seguro)) {
      throw new BadRequestException('Nombre de archivo inválido');
    }
    const filePath = join(process.cwd(), 'uploads', seguro);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    // Como adjunto: el navegador descarga en vez de ejecutar en el origen.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(filePath, seguro);
  }
}
