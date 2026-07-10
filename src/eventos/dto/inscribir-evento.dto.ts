import { IsArray, IsString, IsOptional, IsBoolean } from 'class-validator';

export class InscribirEventoDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categorias?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  disciplinas?: string[];

  @IsOptional()
  @IsBoolean()
  necesidades_especiales?: boolean;

  @IsOptional()
  @IsString()
  descripcion_necesidades?: string;
}
