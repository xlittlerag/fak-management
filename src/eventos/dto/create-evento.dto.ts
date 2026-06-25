import { IsString, IsDateString, IsObject, IsOptional, IsNumber, Min, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

export class RangoExamenDto {
  @IsString()
  disciplina: string;

  @IsString()
  grad_min: string;

  @IsString()
  grad_max: string;
}

export class CreateEventoDto {
  @IsString()
  tipo: string;

  @IsOptional()
  @IsString()
  ambito?: string;

  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;

  @IsObject()
  datos_lugar: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  pago_fuera_sistema?: boolean;

  @IsOptional()
  @IsArray()
  archivos_info?: string[];

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
  @ValidateNested({ each: true })
  @Type(() => RangoExamenDto)
  graduaciones_a_rendir?: RangoExamenDto[];

  @IsOptional()
  @IsString()
  info_adicional?: string;

  @IsOptional()
  @IsDateString()
  fecha_limite_informativa?: string;

  @IsOptional()
  @IsDateString()
  fecha_limite_real?: string;

  @IsOptional()
  @IsBoolean()
  inscripciones_abiertas?: boolean;
}
