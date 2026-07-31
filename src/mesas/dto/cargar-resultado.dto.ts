import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

const DISCIPLINAS_VALIDAS = ['KENDO', 'IAIDO', 'JODO'];

export class CargarResultadoDto {
  @IsInt()
  inscripcion_id: number;

  @IsString()
  @IsIn(DISCIPLINAS_VALIDAS, { message: 'La disciplina no es válida' })
  disciplina: string;

  @IsIn(['PRACTICO', 'KATA', 'ESCRITO'], {
    message: 'La instancia no es válida',
  })
  instancia: 'PRACTICO' | 'KATA' | 'ESCRITO';

  @IsBoolean()
  aprobado: boolean;

  @IsOptional()
  @IsInt()
  mesa_id?: number;
}
