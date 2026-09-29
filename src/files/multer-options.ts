import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Prefiltro por extensión declarada. La validación real es por magic-bytes
// en FilesService (el mimetype y el nombre los controla el cliente).
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.pdf']);

function tmpDir(): string {
  const dir = join(process.cwd(), 'uploads', 'tmp');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
): void {
  if (!ALLOWED_EXT.has(extname(file.originalname).toLowerCase())) {
    cb(
      new BadRequestException('Formato no permitido. Solo JPG, PNG y PDF'),
      false,
    );
    return;
  }
  cb(null, true);
}

// Almacenamiento en disco (nunca en RAM) con nombre temporal: FilesService
// valida el contenido y recién ahí lo mueve al nombre definitivo.
export function multerOptions() {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => cb(null, tmpDir()),
      filename: (_req, _file, cb) => cb(null, `${randomUUID()}.tmp`),
    }),
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  };
}
