import { Rol, EstadoRegistro } from '@prisma/client';

export interface AuthUser {
  id: number;
  email: string;
  rol: Rol;
  asociacion_id: number;
  estado_reg?: EstadoRegistro;
}
