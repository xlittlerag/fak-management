import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCertificadoDto {
  @IsString()
  @IsNotEmpty()
  url_archivo: string;

  @IsString()
  @IsNotEmpty()
  disciplina: string;

  @IsString()
  @IsNotEmpty()
  grad_solicitada: string;
}
