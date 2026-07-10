import { Module } from '@nestjs/common';
import { CertificadosController } from './certificados.controller';
import { CertificadosService } from './certificados.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [CertificadosController],
  providers: [CertificadosService],
})
export class CertificadosModule {}
