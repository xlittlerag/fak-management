import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { MercadoPagoService } from './mercado-pago.service';
import { FeeConfigService } from './fee-config.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import type { Request } from 'express';

@Controller('pagos')
export class MercadoPagoController {
  private readonly logger = new Logger(MercadoPagoController.name);

  constructor(
    private readonly mpService: MercadoPagoService,
    private readonly feeConfigService: FeeConfigService,
    private readonly configService: ConfigService,
  ) {}

  private get isSimulated(): boolean {
    return this.configService.get<string>('MERCADO_PAGO_SIMULATED') === 'true';
  }

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
      throw new ForbiddenException(
        'Su cuenta no está activa para realizar pagos',
      );
    }
    if (
      userStatus.estado_reg === 'PENDIENTE_APROBACION' ||
      userStatus.estado_reg === 'DESAFILIADO'
    ) {
      throw new ForbiddenException(
        'Su cuenta no está activa para realizar pagos',
      );
    }

    const result = await this.mpService.createFederativeFeePreference(
      user.id,
      user.email,
      feeConfig.monto_actual,
    );

    this.logger.log(
      `Preferencia de checkout creada para ${user.email}, ID: ${result.preferenceId}`,
    );

    return result;
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() webhookData: Record<string, unknown>) {
    this.logger.log(`Webhook recibido: ${JSON.stringify(webhookData)}`);

    try {
      const result = await this.mpService.processWebhook(webhookData);

      if (result.processed && 'userId' in result) {
        this.logger.log(
          `Pago procesado exitosamente para usuario ${result.userId}`,
        );
      }

      return { received: true, processed: result.processed };
    } catch (error) {
      this.logger.error(
        `Error procesando webhook: ${(error as Error).message}`,
      );

      return { received: true };
    }
  }

  @Post('simulate')
  @Public()
  @HttpCode(HttpStatus.OK)
  async simulatePayment(
    @Body()
    body: {
      externalReference: string;
      status?: 'approved' | 'rejected';
    },
  ) {
    if (!this.isSimulated) {
      throw new ForbiddenException('Modo simulado no habilitado');
    }

    if (!body.externalReference) {
      throw new ForbiddenException('externalReference es requerido');
    }

    const status = body.status ?? 'approved';
    const result = await this.mpService.simulatePayment(
      body.externalReference,
      status,
    );

    this.logger.log(`Pago simulado para ${body.externalReference}: ${status}`);

    // The service returns different shapes; normalize the response
    const success = 'success' in result ? result.success : result.processed;
    const message = 'message' in result ? result.message : undefined;

    return { success, processed: result.processed, message };
  }
}
