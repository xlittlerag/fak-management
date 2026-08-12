import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

const DISCIPLINAS_VALIDAS = ['KENDO', 'IAIDO', 'JODO'];
const INSTANCIAS_VALIDAS = ['PRACTICO', 'KATA', 'ESCRITO'];

export class CargarAvanceDto {
  @IsInt()
  inscripcion_id: number;

  @IsString()
  @IsIn(DISCIPLINAS_VALIDAS, { message: 'La disciplina no es válida' })
  disciplina: string;

  @IsOptional()
  @IsIn(INSTANCIAS_VALIDAS, { message: 'La instancia aprobada no es válida' })
  aprobada_hasta?: 'PRACTICO' | 'KATA' | 'ESCRITO';

  @IsOptional()
  @IsIn(INSTANCIAS_VALIDAS, {
    message: 'La instancia desaprobada no es válida',
  })
  desaprobada?: 'PRACTICO' | 'KATA' | 'ESCRITO';

  @IsOptional()
  @IsInt()
  mesa_id?: number;
}
