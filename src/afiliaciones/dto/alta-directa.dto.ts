import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AltaDirectaDto {
  @IsInt()
  @IsNotEmpty()
  dojo_id: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}
