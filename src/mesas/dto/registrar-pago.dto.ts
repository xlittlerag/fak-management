import { IsIn, IsString } from 'class-validator';

const DISCIPLINAS_VALIDAS = ['KENDO', 'IAIDO', 'JODO'];

export class RegistrarPagoDto {
  @IsString()
  @IsIn(DISCIPLINAS_VALIDAS, { message: 'La disciplina no es válida' })
  disciplina: string;
}
