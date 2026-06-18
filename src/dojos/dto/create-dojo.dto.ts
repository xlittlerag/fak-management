import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateDojoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsInt()
  @IsNotEmpty()
  asociacion_id: number;
}
