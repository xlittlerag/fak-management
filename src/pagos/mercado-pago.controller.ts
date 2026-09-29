import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MercadoPagoService } from './mercado-pago.service';
import { FeeConfigService } from './fee-config.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { WebhookDto, SimulateDto } from './dto/webhook.dto';
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
  // Límite propio (MP reintenta en ráfagas): 60/min en vez del global 30.
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  // Mercado Pago envía campos propios (type, date_created, ...): se validan
  // los conocidos y se ignoran los demás en vez de rechazar con 400.
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  )
  async handleWebhook(
    @Body() dto: WebhookDto,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    const dataId =
      typeof dto.data?.id === 'string' || typeof dto.data?.id === 'number'
        ? String(dto.data.id)
        : '';
    if (
      dataId &&
      !this.mpService.verificarFirmaWebhook(dataId, xSignature, xRequestId)
    ) {
      throw new UnauthorizedException('Firma del webhook inválida.');
    }
    this.logger.log(`Webhook recibido: ${JSON.stringify(dto)}`);

    try {
      const result = await this.mpService.processWebhook(dto);

      if (result.processed && 'userId' in result) {
        this.logger.log(
          `Pago procesado exitosamente para usuario ${String(result.userId)}`,
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
  async simulatePayment(@Body() dto: SimulateDto) {
    // Doble gate: ni con el flag en true funciona en producción.
    if (
      !this.isSimulated ||
      this.configService.get<string>('NODE_ENV') === 'production'
    ) {
      throw new ForbiddenException('Modo simulado no habilitado');
    }

    const status = dto.status ?? 'approved';
    const result = (await this.mpService.simulatePayment(
      dto.externalReference,
      status,
    )) as { success?: boolean; processed: boolean; message?: string };

    this.logger.log(`Pago simulado para ${dto.externalReference}: ${status}`);

    // The service returns different shapes; normalize the response
    const success = 'success' in result ? result.success : result.processed;
    const message = 'message' in result ? result.message : undefined;

    return { success, processed: result.processed, message };
  }
}
