import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../common/interfaces/auth-user.interface';

interface JwtPayload {
  sub: number;
  email: string;
  rol: string;
  asociacion_id: number;
  estado_reg?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    return {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol as AuthUser['rol'],
      asociacion_id: payload.asociacion_id,
      estado_reg: payload.estado_reg as AuthUser['estado_reg'],
    };
  }
}
