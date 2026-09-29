import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

// Política: mínimo 12, máximo 128 (el máximo acota el costo de argon2id).
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export class CompleteResetDto {
  @IsString()
  @IsNotEmpty()
  dni: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 8, { message: 'El código debe tener 8 caracteres.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  codigo: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`,
  })
  nueva_password: string;
}
