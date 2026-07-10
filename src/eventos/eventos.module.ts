import { Module } from '@nestjs/common';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';
import { PagosModule } from '../pagos/pagos.module';
import { PreciosExamenModule } from '../precios-examen/precios-examen.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [PagosModule, PreciosExamenModule, FilesModule],
  controllers: [EventosController],
  providers: [EventosService],
})
export class EventosModule {}
