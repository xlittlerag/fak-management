import { IsOptional, IsString } from 'class-validator';

export class UpdateDojoDto {
  @IsString()
  @IsOptional()
  nombre?: string;
}
