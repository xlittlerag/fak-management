import { Module } from '@nestjs/common';
import { CertificadosController } from './certificados.controller';
import { CertificadosService } from './certificados.service';
import { FilesModule } from '../files/files.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [FilesModule, NotificacionesModule],
  controllers: [CertificadosController],
  providers: [CertificadosService],
})
export class CertificadosModule {}
