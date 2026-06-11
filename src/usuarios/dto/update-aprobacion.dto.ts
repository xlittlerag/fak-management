import { IsEnum, IsNotEmpty } from 'class-validator';

export enum AprobacionAccion {
  APROBAR = 'APROBAR',
  RECHAZAR = 'RECHAZAR',
}

export class UpdateAprobacionDto {
  @IsEnum(AprobacionAccion)
  @IsNotEmpty()
  accion: AprobacionAccion;
}
