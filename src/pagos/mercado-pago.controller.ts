import { Controller, Post, Body, Req, HttpCode, HttpStatus, Logger, ForbiddenException } from '@nestjs/common';
import { MercadoPagoService } from './mercado-pago.service';
import { FeeConfigService } from './fee-config.service';
import { Public } from '../auth/decorators/public.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import type { Request } from 'express';

@Controller('pagos')
export class MercadoPagoController {
  private readonly logger = new Logger(MercadoPagoController.name);

  constructor(
    private readonly mpService: MercadoPagoService,
    private readonly feeConfigService: FeeConfigService,
  ) {}

  @Post('checkout-fee')
  @HttpCode(HttpStatus.OK)
  async createFeeCheckoutPreference(@Req() request: Request) {
    const user = request.user as AuthUser;

    const feeConfig = await this.feeConfigService.getFeeConfig();

    if (!feeConfig) {
      throw new ForbiddenException('No se ha configurado la cuota federativa');
    }

    const userStatus = await this.mpService.getUserStatus(user.id);
    if (!userStatus) {
      throw new ForbiddenException('Su cuenta no está activa para realizar pagos');
    }
    if (userStatus.estado_reg === 'PENDIENTE_APROBACION') {
      throw new ForbiddenException('Su cuenta no está activa para realizar pagos');
    }

    const result = await this.mpService.createFederativeFeePreference(
      user.id,
      user.email,
      feeConfig.monto_actual,
    );

    this.logger.log(`Preferencia de checkout creada para ${user.email}, ID: ${result.preferenceId}`);

    return result;
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() webhookData: Record<string, unknown>) {
    this.logger.log(`Webhook recibido: ${JSON.stringify(webhookData)}`);

    try {
      const result = await this.mpService.processWebhook(webhookData as never);

      if (result.processed && 'userId' in result) {
        this.logger.log(
          `Pago procesado exitosamente para usuario ${result.userId}`,
        );
      }

      return { received: true, processed: result.processed };
    } catch (error) {
      this.logger.error(`Error procesando webhook: ${(error as Error).message}`);

      return { received: true };
    }
  }
}
