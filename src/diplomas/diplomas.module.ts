import { Module } from '@nestjs/common';
import { DiplomasController } from './diplomas.controller';
import { DiplomasService } from './diplomas.service';
import { PagosModule } from '../pagos/pagos.module';

@Module({
  imports: [PagosModule],
  controllers: [DiplomasController],
  providers: [DiplomasService],
})
export class DiplomasModule {}
