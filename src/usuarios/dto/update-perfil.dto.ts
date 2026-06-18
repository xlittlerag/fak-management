import { IsString, IsOptional, IsDateString, IsEnum, MinLength, IsEmail } from 'class-validator';
import { Sexo, Provincia } from '@prisma/client';

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

  @IsEnum(Sexo)
  @IsOptional()
  sexo?: Sexo;

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

  @IsInt()
  @IsOptional()
  dojo_id?: number;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;
}
