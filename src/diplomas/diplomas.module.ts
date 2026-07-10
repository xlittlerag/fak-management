import { Module } from '@nestjs/common';
import { DiplomasController } from './diplomas.controller';
import { DiplomasService } from './diplomas.service';
import { PagosModule } from '../pagos/pagos.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [PagosModule, FilesModule],
  controllers: [DiplomasController],
  providers: [DiplomasService],
})
export class DiplomasModule {}
