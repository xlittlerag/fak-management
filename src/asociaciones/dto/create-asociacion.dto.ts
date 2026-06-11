import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAsociacionDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
