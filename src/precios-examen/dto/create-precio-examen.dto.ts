import { IsString, IsNumber, Min } from 'class-validator';

export class CreatePrecioExamenDto {
  @IsString()
  graduacion: string;

  @IsNumber()
  @Min(0)
  costo_inscripcion: number;

  @IsNumber()
  @Min(0)
  costo_registro: number;
}
