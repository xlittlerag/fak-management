import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCertificadoDto {
  @IsString()
  @IsNotEmpty()
  disciplina: string;

  @IsString()
  @IsNotEmpty()
  grad_solicitada: string;
}
