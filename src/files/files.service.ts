import { Injectable, BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class FilesService {
  private uploadDir = join(process.cwd(), 'uploads');

  constructor() {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo');
    }
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Solo JPG, PNG y PDF');
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('El archivo supera el tamaño máximo de 10MB');
    }

    const ext = file.originalname.split('.').pop();
    const filename = `${uuid()}.${ext}`;
    const filepath = join(this.uploadDir, filename);

    await writeFile(filepath, file.buffer);

    return `/uploads/${filename}`;
  }
}
