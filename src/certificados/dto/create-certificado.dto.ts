import {
  IsDateString,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class CreateCertificadoDto {
  @IsString()
  @IsNotEmpty()
  disciplina: string;

  @IsString()
  @IsNotEmpty()
  grad_solicitada: string;

  // TC-07: fecha real en que se obtuvo el grado (opcional; si no se indica
  // se usa la fecha de aprobación). No puede ser futura.
  @IsOptional()
  @IsDateString()
  fecha_obtencion?: string;
}
