import { Injectable, BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Tipos reales detectados por magic-bytes (no por el mimetype declarado,
// que lo controla el cliente). La extensión guardada sale de acá.
const FIRMAS: { ext: string; firma: number[] }[] = [
  { ext: 'jpg', firma: [0xff, 0xd8, 0xff] },
  { ext: 'png', firma: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: 'pdf', firma: [0x25, 0x50, 0x44, 0x46] },
];

function detectarExtension(contenido: Buffer): string | null {
  for (const { ext, firma } of FIRMAS) {
    if (
      contenido.length >= firma.length &&
      firma.every((b, i) => contenido[i] === b)
    ) {
      return ext;
    }
  }
  return null;
}

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
    // Con diskStorage no hay buffer: se lee del archivo temporal.
    const contenido: Buffer = file.buffer ?? (await readFile(file.path));
    if (contenido.length > MAX_SIZE) {
      throw new BadRequestException(
        'El archivo supera el tamaño máximo de 10MB',
      );
    }
    // El tipo real manda: ignora mimetype y nombre declarados por el cliente.
    const ext = detectarExtension(contenido);
    if (!ext) {
      throw new BadRequestException(
        'Formato no permitido. Solo JPG, PNG y PDF',
      );
    }

    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(this.uploadDir, filename);

    await writeFile(filepath, contenido);

    return `/api/uploads/${filename}`;
  }
}
