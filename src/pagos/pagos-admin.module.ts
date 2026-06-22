import { Module } from '@nestjs/common';
import { PagosModule } from './pagos.module';
import { AdminFeeController } from './admin-fee.controller';

@Module({
  imports: [PagosModule],
  controllers: [AdminFeeController],
  providers: [],
  exports: [],
})
export class PagosAdminModule {}
