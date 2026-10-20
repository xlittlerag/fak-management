import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificacionesService } from './notificaciones.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'MAIL_TRANSPORT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('SMTP_HOST');
        if (!host) return null;

        const port = Number(config.get('SMTP_PORT', 587));
        const secureRaw = config.get<string>('SMTP_SECURE');
        // 465 implica TLS directo; 587/25 usan STARTTLS.
        const secure = secureRaw ? secureRaw === 'true' : port === 465;

        const user = config.get<string>('SMTP_USER');
        const pass = config.get<string>('SMTP_PASSWORD');
        const auth = user && pass ? { user, pass } : undefined;

        return nodemailer.createTransport({
          host,
          port,
          secure,
          auth,
          requireTLS: config.get<string>('SMTP_REQUIRE_TLS') === 'true',
        });
      },
    },
    NotificacionesService,
  ],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
