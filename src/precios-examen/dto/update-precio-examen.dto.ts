import { PartialType } from '@nestjs/mapped-types';
import { CreatePrecioExamenDto } from './create-precio-examen.dto';

export class UpdatePrecioExamenDto extends PartialType(CreatePrecioExamenDto) {}
