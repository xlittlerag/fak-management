import { Controller, Post, Body, Req, HttpCode, HttpStatus, Logger, UseGuards, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { MercadoPagoService } from './mercado-pago.service';
import { FeeConfigService } from './fee-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import type { Request } from 'express';

@Controller('pagos')
@UseGuards(JwtAuthGuard)
export class MercadoPagoController {
  private readonly logger = new Logger(MercadoPagoController.name);

  constructor(
    private readonly mpService: MercadoPagoService,
    private readonly feeConfigService: FeeConfigService,
  ) {}

  @Post('checkout-fee')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async createFeeCheckoutPreference(@Req() request: Request) {
    const user = (request as any).user;

    const feeConfig = await this.feeConfigService.getFeeConfig();

    if (!feeConfig) {
      throw new InternalServerErrorException('No se ha configurado la cuota federativa');
    }

    const userStatus = await this.mpService.getUserStatus(user.id);
    if (!userStatus) {
      throw new ForbiddenException('Su cuenta no está activa para realizar pagos');
    }
    if (userStatus.estado_reg === 'PENDIENTE_APROBACION') {
      const isFeeOverdue = new Date(feeConfig.fecha_vencimiento) < new Date();
      if (userStatus.estado_pago !== false || !isFeeOverdue) {
        throw new ForbiddenException('Su cuenta no está activa para realizar pagos');
      }
    }

    const result = await this.mpService.createFederativeFeePreference(
      user.id,
      user.email,
      feeConfig.monto_actual,
    );

    this.logger.log(`Checkout preference created for user ${user.email}, preference ID: ${result.preferenceId}`);

    return result;
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() webhookData: any) {
    this.logger.log(`Webhook received: ${JSON.stringify(webhookData)}`);

    try {
      const result = await this.mpService.processWebhook(webhookData);

      if (result.processed) {
        this.logger.log(
          `Payment processed successfully for user ${result.userId}`,
        );
      }

      return { received: true, processed: result.processed };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);

      return { received: true };
    }
  }
}
