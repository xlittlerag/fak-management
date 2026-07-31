import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SolicitarAltaDto {
  @IsInt()
  @IsNotEmpty()
  asociacion_id: number;

  @IsInt()
  @IsNotEmpty()
  dojo_id: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}
