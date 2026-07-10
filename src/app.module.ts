import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ServeStaticModule } from '@nestjs/serve-static';
import { randomUUID } from 'node:crypto';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AsociacionesModule } from './asociaciones/asociaciones.module';
import { DojosModule } from './dojos/dojos.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PagosModule } from './pagos/pagos.module';
import { PagosAdminModule } from './pagos/pagos-admin.module';
import { EventosModule } from './eventos/eventos.module';
import { PreciosExamenModule } from './precios-examen/precios-examen.module';
import { FilesModule } from './files/files.module';
import { CertificadosModule } from './certificados/certificados.module';
import { DiplomasModule } from './diplomas/diplomas.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { LoggingInterceptor } from './common/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: () => randomUUID(),
        autoLogging: false,
        level: process.env.LOG_LEVEL ?? 'info',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 30,
    }]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'frontend', 'dist'),
      exclude: ['/api/*path'],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { index: false },
      exclude: ['/api/*path'],
    }),
    PrismaModule,
    AuthModule,
    AsociacionesModule,
    DojosModule,
    UsuariosModule,
    PagosModule,
    PagosAdminModule,
    EventosModule,
    PreciosExamenModule,
    FilesModule,
    CertificadosModule,
    DiplomasModule,
    AuditoriaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
