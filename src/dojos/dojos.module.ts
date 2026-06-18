import { Module } from '@nestjs/common';
import { DojosService } from './dojos.service';
import { DojosController } from './dojos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DojosController],
  providers: [DojosService],
  exports: [DojosService],
})
export class DojosModule {}
