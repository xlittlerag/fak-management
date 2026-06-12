import { IsString, IsOptional, IsDateString, IsEnum, MinLength, IsEmail } from 'class-validator';
import { Genero, Provincia } from '@prisma/client';

export class UpdatePerfilDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  apellido?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsDateString()
  @IsOptional()
  fecha_nacimiento?: string;

  @IsEnum(Genero)
  @IsOptional()
  genero?: Genero;

  @IsString()
  @IsOptional()
  calle_altura?: string;

  @IsString()
  @IsOptional()
  piso_depto?: string;

  @IsString()
  @IsOptional()
  ciudad?: string;

  @IsEnum(Provincia)
  @IsOptional()
  provincia?: Provincia;

  @IsString()
  @IsOptional()
  codigo_postal?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;
}
