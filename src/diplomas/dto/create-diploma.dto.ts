import { IsString, IsNotEmpty, IsInt, IsOptional, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDiplomaDto {
  @IsString()
  @IsNotEmpty()
  url_archivo: string;

  @IsInt()
  usuario_id: number;

  @IsString()
  @IsNotEmpty()
  disciplina: string;

  @IsOptional()
  @IsString()
  graduacion?: string;

  @IsOptional()
  @IsInt()
  inscripcion_id?: number;
}

class ArchivoLoteDto {
  @IsInt()
  usuario_id: number;

  @IsString()
  @IsNotEmpty()
  disciplina: string;

  @IsString()
  @IsNotEmpty()
  url_archivo: string;
}

export class CreateDiplomaLoteDto {
  @IsInt()
  evento_id: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArchivoLoteDto)
  archivos: ArchivoLoteDto[];
}
