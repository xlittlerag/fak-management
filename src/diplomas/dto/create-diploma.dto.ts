import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDiplomaDto {
  @IsInt()
  @Type(() => Number)
  usuario_id: number;

  @IsString()
  @IsNotEmpty()
  disciplina: string;

  @IsOptional()
  @IsString()
  graduacion?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  inscripcion_id?: number;
}

export class CreateDiplomaLoteDto {
  @IsInt()
  @Type(() => Number)
  evento_id: number;
}
