import { IsString, IsNotEmpty } from 'class-validator';

export class ReimprimirDto {
  @IsString()
  @IsNotEmpty()
  disciplina: string;
}
