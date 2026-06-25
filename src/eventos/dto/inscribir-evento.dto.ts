import { IsArray, IsString, IsOptional } from 'class-validator';

export class InscribirEventoDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categorias?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  disciplinas?: string[];
}
