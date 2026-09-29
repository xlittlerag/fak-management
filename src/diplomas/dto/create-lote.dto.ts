import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

// Los campos de multipart llegan como strings: se convierten acá.
export class CreateLoteDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt({ message: 'El ID de evento debe ser un número entero.' })
  @Min(1, { message: 'El ID de evento no es válido.' })
  evento_id: number;

  @IsString()
  @IsNotEmpty({ message: 'Los metadatos de archivos son obligatorios.' })
  archivos_meta: string;
}
