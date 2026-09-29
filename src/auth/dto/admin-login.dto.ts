import { IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
  @IsString({ message: 'La contraseña debe ser un texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  password: string;
}
