import { IsString, IsDateString, IsObject, IsOptional, IsNumber, Min, IsArray, IsBoolean } from 'class-validator';

export class CategoriaDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  genero?: string;

  @IsOptional()
  @IsString()
  grad_min?: string;

  @IsOptional()
  @IsString()
  grad_max?: string;

  @IsOptional()
  @IsNumber()
  edad_min?: number;

  @IsOptional()
  @IsNumber()
  edad_max?: number;
}

export class CreateEventoDto {
  @IsString()
  tipo: string;

  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;

  @IsObject()
  datos_lugar: Record<string, any>;

  @IsOptional()
  @IsString()
  disciplina?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_inscripcion?: number;

  @IsOptional()
  @IsArray()
  categorias?: CategoriaDto[];

  @IsOptional()
  @IsString()
  grad_min?: string;

  @IsOptional()
  @IsString()
  grad_max?: string;

  @IsOptional()
  @IsBoolean()
  inscripcion_multiple?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disciplinas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  graduaciones_a_rendir?: string[];

  @IsOptional()
  @IsString()
  info_adicional?: string;
}
