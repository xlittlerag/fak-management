import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class UploadsController {
  @Get('uploads/:filename')
  @Public()
  serve(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    res.sendFile(filePath);
  }
}
