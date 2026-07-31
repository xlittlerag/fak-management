import { IsEmail, IsOptional } from 'class-validator';

export class ConfigFakEmailDto {
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  fak_email?: string | null;
}
