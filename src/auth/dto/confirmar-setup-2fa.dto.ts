import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ConfirmarSetup2faDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 8)
  codigo: string;
}
