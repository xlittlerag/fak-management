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
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    NotificacionesModule,
  ],
  providers: [AuthService, PasswordService, TwoFactorService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, PasswordService, TwoFactorService, JwtModule],
})
export class AuthModule {}
