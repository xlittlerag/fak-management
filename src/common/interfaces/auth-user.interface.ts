import { Rol } from '@prisma/client';

export interface AuthUser {
  id: number;
  email: string;
  rol: Rol;
  asociacion_id: number;
}
