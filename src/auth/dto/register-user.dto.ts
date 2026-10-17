import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsInt,
  IsDateString,
  IsEnum,
  IsOptional,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Sexo, Provincia } from '@prisma/client';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './complete-reset.dto';

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
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`,
  })
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
  dojo_id: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9+\-\s().]+$/, {
    message:
      'El teléfono solo puede contener números, espacios y los símbolos + - ( ) .',
  })
  telefono: string;
}
