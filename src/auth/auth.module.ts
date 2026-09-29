import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TwoFactorService } from './two-factor.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.getOrThrow<string>('JWT_SECRET');
        // Fail-closed: sin secreto o con secreto débil la app no arranca.
        if (secret.length < 32) {
          throw new Error(
            'JWT_SECRET debe tener al menos 32 caracteres (generar con: openssl rand -hex 32).',
          );
        }
        return { secret, signOptions: { expiresIn: '1d' } };
      },
    }),
    NotificacionesModule,
  ],
  providers: [AuthService, PasswordService, TwoFactorService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, PasswordService, TwoFactorService, JwtModule],
})
export class AuthModule {}
