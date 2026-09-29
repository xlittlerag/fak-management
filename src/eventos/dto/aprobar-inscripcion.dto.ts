import { IsIn } from 'class-validator';

export class AprobarInscripcionDto {
  @IsIn(['APROBAR', 'RECHAZAR'], {
    message: 'La acción debe ser APROBAR o RECHAZAR.',
  })
  accion: 'APROBAR' | 'RECHAZAR';
}
