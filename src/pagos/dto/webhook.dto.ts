import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class WebhookDataDto {
  // Mercado Pago envía el id numérico o string según el caso.
  @IsOptional()
  id?: unknown;
}

// Mercado Pago agrega campos propios (type, date_created, ...) que se
// ignoran: la ruta usa whitelist sin forbidNonWhitelisted.
export class WebhookDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WebhookDataDto)
  data?: WebhookDataDto;
}

export class SimulateDto {
  @IsString()
  @IsNotEmpty({ message: 'externalReference es requerido.' })
  externalReference: string;

  @IsOptional()
  @IsIn(['approved', 'rejected'], {
    message: 'El estado debe ser approved o rejected.',
  })
  status?: 'approved' | 'rejected';
}
