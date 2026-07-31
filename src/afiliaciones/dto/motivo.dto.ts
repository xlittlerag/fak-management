import { IsOptional, IsString } from 'class-validator';

export class MotivoDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}
