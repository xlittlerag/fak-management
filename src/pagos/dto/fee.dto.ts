import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';

export class SetFeeDto {
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @IsNotEmpty({ message: 'El monto es obligatorio' })
  @Min(0, { message: 'El monto no puede ser negativo' })
  monto_actual: number;

  @IsString({ message: 'La fecha de vencimiento debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La fecha de vencimiento es obligatoria' })
  fecha_vencimiento: string;
}

