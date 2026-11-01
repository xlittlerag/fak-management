import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AUTH_COOKIE_NAME } from '../auth-cookie';
import { AuthUser } from '../../common/interfaces/auth-user.interface';

interface JwtPayload {
  sub: number;
  email: string;
  rol: string;
  asociacion_id: number;
  estado_reg?: string;
  // Token pendiente del segundo paso de admin-login: solo sirve para
  // POST /auth/admin-2fa/verificar, nunca como sesión.
  pendiente_2fa?: boolean;
}

function extractToken(request: Request): string | null {
  // Se acepta la cookie httpOnly de sesión; el encabezado Bearer se
  // mantiene por compatibilidad (tests, integraciones existentes).
  const cookieToken: unknown = request.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === 'string') {
    return cookieToken;
  }

  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length);
  }

  return null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    if (payload.pendiente_2fa) {
      throw new UnauthorizedException(
        'Sesión incompleta: falta el segundo factor de autenticación.',
      );
    }

    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol as AuthUser['rol'],
      asociacion_id: payload.asociacion_id,
      estado_reg: payload.estado_reg as AuthUser['estado_reg'],
    };
    request.user = user;

    return true;
  }
}
