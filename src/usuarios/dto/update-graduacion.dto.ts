import { IsOptional, IsString } from 'class-validator';

export class UpdateGraduacionDto {
  @IsOptional()
  @IsString()
  grad_kendo?: string;

  @IsOptional()
  @IsString()
  f_grad_kendo?: string;

  @IsOptional()
  @IsString()
  grad_iaido?: string;

  @IsOptional()
  @IsString()
  f_grad_iaido?: string;

  @IsOptional()
  @IsString()
  grad_jodo?: string;

  @IsOptional()
  @IsString()
  f_grad_jodo?: string;
}
