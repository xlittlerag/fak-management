import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerificarAdmin2faDto {
  @IsString()
  @IsNotEmpty()
  token_pendiente: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 8)
  codigo: string;
}
