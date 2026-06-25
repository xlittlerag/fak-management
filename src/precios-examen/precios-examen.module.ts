import { Module } from '@nestjs/common';
import { PreciosExamenController } from './precios-examen.controller';
import { PreciosExamenService } from './precios-examen.service';

@Module({
  controllers: [PreciosExamenController],
  providers: [PreciosExamenService],
  exports: [PreciosExamenService],
})
export class PreciosExamenModule {}
