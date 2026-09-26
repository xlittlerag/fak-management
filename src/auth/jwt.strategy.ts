import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { AUTH_COOKIE_NAME } from './auth-cookie';
import type { Request } from 'express';

interface JwtPayload {
  sub: number;
  email: string;
  rol: string;
  asociacion_id: number;
  estado_reg?: string;
}

function cookieExtractor(req: Request | undefined): string | null {
  const token: unknown = req?.cookies?.[AUTH_COOKIE_NAME];
  return typeof token === 'string' ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Se acepta la cookie httpOnly de sesión; el encabezado Bearer se
      // mantiene por compatibilidad (tests, integraciones existentes).
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol as AuthUser['rol'],
      asociacion_id: payload.asociacion_id,
      estado_reg: payload.estado_reg as AuthUser['estado_reg'],
    };
  }
}
