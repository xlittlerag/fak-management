import { IsNumber, Min } from 'class-validator';

export class UpdateConfigDto {
  @IsNumber()
  @Min(0)
  precio_reimpresion: number;
}
