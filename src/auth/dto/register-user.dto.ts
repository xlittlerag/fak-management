import { IsEmail, IsNotEmpty, IsString, IsInt, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { Sexo, Provincia } from '@prisma/client';

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

  @IsEnum(Sexo)
  sexo: Sexo;

  @IsString()
  @IsNotEmpty()
  calle_altura: string;

  @IsString()
  @IsOptional()
  piso_depto?: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsEnum(Provincia)
  provincia: Provincia;

  @IsString()
  @IsNotEmpty()
  codigo_postal: string;

  @IsInt()
  asociacion_id: number;

  @IsInt()
  @IsOptional()
  dojo_id?: number;
}
