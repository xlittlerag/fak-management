import { IsNotEmpty, IsString } from 'class-validator';

export class Deshabilitar2faDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
