import { IsEmail, IsNotEmpty, IsString, IsInt, IsDateString, IsEnum } from 'class-validator';
import { Genero } from '@prisma/client';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  apellido: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  dni: string;

  @IsDateString()
  fecha_nacimiento: string;

  @IsEnum(Genero)
  genero: Genero;

  @IsInt()
  asociacion_id: number;
}
