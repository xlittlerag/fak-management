import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeeConfigService } from './fee-config.service';
import { MercadoPagoService } from './mercado-pago.service';
import { MercadoPagoController } from './mercado-pago.controller';

@Module({
  imports: [AuthModule],
  controllers: [MercadoPagoController],
  providers: [FeeConfigService, MercadoPagoService],
  exports: [FeeConfigService, MercadoPagoService],
})
export class PagosModule {}
