import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  MinLength,
  MaxLength,
  IsEmail,
  IsInt,
} from 'class-validator';
import { Sexo, Provincia } from '@prisma/client';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../auth/dto/complete-reset.dto';

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
  @IsNotEmpty()
  telefono: string;

  @IsString()
  @IsOptional()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`,
  })
  password?: string;
}
