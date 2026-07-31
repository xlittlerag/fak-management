import {
  IsArray,
  IsString,
  ArrayNotEmpty,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';

const DISCIPLINAS_VALIDAS = ['KENDO', 'IAIDO', 'JODO'];

export class CreateMesaDto {
  @IsString()
  @IsIn(DISCIPLINAS_VALIDAS, { message: 'La disciplina no es válida' })
  disciplina: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Debe indicar al menos un examinador' })
  @ArrayMaxSize(10)
  @IsString({ each: true })
  examinadores: string[];

  @IsString()
  grad_min: string;

  @IsString()
  grad_max: string;
}
