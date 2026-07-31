import { Module } from '@nestjs/common';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AfiliacionesController } from './afiliaciones.controller';
import { AfiliacionesService } from './afiliaciones.service';

@Module({
  imports: [PrismaModule, NotificacionesModule],
  controllers: [AfiliacionesController],
  providers: [AfiliacionesService],
})
export class AfiliacionesModule {}
