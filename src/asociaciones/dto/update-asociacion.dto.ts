import { PartialType } from '@nestjs/mapped-types';
import { CreateAsociacionDto } from './create-asociacion.dto';

export class UpdateAsociacionDto extends PartialType(CreateAsociacionDto) {}
