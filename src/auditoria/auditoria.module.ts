import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaInterceptor } from './auditoria.interceptor';
import { RequestContextService } from './request-context.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AuditoriaController],
  providers: [
    RequestContextService,
    AuditoriaService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditoriaInterceptor,
    },
  ],
  exports: [RequestContextService],
})
export class AuditoriaModule {
  constructor(
    private prisma: PrismaService,
    private ctx: RequestContextService,
  ) {
    this.prisma.setContextService(this.ctx);
  }
}
