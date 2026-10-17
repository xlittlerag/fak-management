import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import MercadoPago, { Preference, Payment } from 'mercadopago';
import { createHmac, timingSafeEqual } from 'crypto';

interface WebhookData {
  action?: string;
  data?: { id?: unknown };
}

@Injectable()
export class MercadoPagoService {
  private client: MercadoPago;
  private readonly logger = new Logger(MercadoPagoService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.client = new MercadoPago({
      accessToken: this.configService.getOrThrow<string>(
        'MERCADO_PAGO_ACCESS_TOKEN',
      ),
      options: { timeout: 5000 },
    });
  }

  private get isSimulated(): boolean {
    return this.configService.get<string>('MERCADO_PAGO_SIMULATED') === 'true';
  }

  /**
   * Verifica la firma HMAC-SHA256 de Mercado Pago.
   * Cabecera `x-signature: ts=...,v1=...` sobre el manifiesto
   * `id:{data.id};request-id:{x-request-id};ts:{ts};` con el secreto
   * de `MERCADO_PAGO_WEBHOOK_SECRET` (sección Webhooks del dashboard de MP).
   * Sin secreto configurado se acepta con advertencia (compatibilidad):
   * configurarlo es obligatorio en producción (ver hosting.md).
   */
  verificarFirmaWebhook(
    dataId: string,
    xSignature: string | undefined,
    xRequestId: string | undefined,
  ): boolean {
    const secreto = this.configService.get<string>(
      'MERCADO_PAGO_WEBHOOK_SECRET',
    );
    if (!secreto) {
      this.logger.warn(
        'MERCADO_PAGO_WEBHOOK_SECRET no configurado: webhook sin verificar firma.',
      );
      return true;
    }
    if (!xSignature || !xRequestId) return false;
    const partes = Object.fromEntries(
      xSignature.split(',').map((p) => {
        const idx = p.indexOf('=');
        return idx === -1
          ? [p.trim(), '']
          : [p.slice(0, idx).trim(), p.slice(idx + 1).trim()];
      }),
    );
    const ts = partes['ts'];
    const v1 = partes['v1'];
    if (!ts || !v1) return false;
    const manifiesto = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const esperado = createHmac('sha256', secreto).update(manifiesto).digest();
    let recibido: Buffer;
    try {
      recibido = Buffer.from(v1, 'hex');
    } catch {
      return false;
    }
    return (
      recibido.length === esperado.length && timingSafeEqual(recibido, esperado)
    );
  }

  async createFederativeFeePreference(
    userId: number,
    userEmail: string,
    amount: number,
  ) {
    const externalReference = `fee_user_${userId}_ts_${Date.now()}`;

    if (this.isSimulated) {
      return {
        preferenceId: `sim_${externalReference}`,
        initPoint:
          'https://simulacion.mercadopago.com/checkout/v1/preferences/sim',
        externalReference,
        paymentMethods: { excludedPaymentTypes: [{ id: 'credit_card' }] },
        simulated: true,
      };
    }

    const preferenceClient = new Preference(this.client);
    const appUrl = this.configService.get<string>('APP_URL');

    try {
      const preferenceResponse = await preferenceClient.create({
        body: {
          items: [
            {
              id: `fee_${userId}`,
              title: 'Cuota Federativa Anual',
              quantity: 1,
              unit_price: amount,
            },
          ],
          payer: {
            email: userEmail,
          },
          back_urls: {
            success: `${appUrl}/pagos/exito`,
            pending: `${appUrl}/pagos/pending`,
            failure: `${appUrl}/pagos/error`,
          },
          external_reference: externalReference,
          notification_url: `${appUrl}/api/pagos/webhook`,
          auto_return: 'approved',
          payment_methods: {
            excluded_payment_types: [
              {
                id: 'credit_card',
              },
            ],
          },
          statement_descriptor: 'KendoArgentina Cuota',
        },
      });

      return {
        preferenceId: preferenceResponse.id,
        initPoint:
          preferenceResponse.init_point ||
          preferenceResponse.sandbox_init_point,
        externalReference: preferenceResponse.external_reference,
        paymentMethods: {
          excludedPaymentTypes: [
            {
              id: 'credit_card',
            },
          ],
        },
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error al crear preferencia de pago: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'No se pudo crear la preferencia de pago',
      );
    }
  }

  async createInscriptionPreference(
    userId: number,
    userEmail: string,
    amount: number,
    inscripcionId: number,
    eventoId: number,
  ) {
    const externalReference = `inscripcion_user_${userId}_evento_${eventoId}_insc_${inscripcionId}_ts_${Date.now()}`;

    if (this.isSimulated) {
      return {
        preferenceId: `sim_${externalReference}`,
        initPoint:
          'https://simulacion.mercadopago.com/checkout/v1/preferences/sim',
        externalReference,
        simulated: true,
      };
    }

    const preferenceClient = new Preference(this.client);
    const appUrl = this.configService.get<string>('APP_URL');

    try {
      const preferenceResponse = await preferenceClient.create({
        body: {
          items: [
            {
              id: `insc_${inscripcionId}`,
              title: 'Inscripción a Evento',
              quantity: 1,
              unit_price: amount,
            },
          ],
          payer: {
            email: userEmail,
          },
          back_urls: {
            success: `${appUrl}/pagos/exito`,
            pending: `${appUrl}/pagos/pending`,
            failure: `${appUrl}/pagos/error`,
          },
          external_reference: externalReference,
          notification_url: `${appUrl}/api/pagos/webhook`,
          auto_return: 'approved',
          payment_methods: {
            excluded_payment_types: [
              {
                id: 'credit_card',
              },
            ],
          },
          statement_descriptor: 'KendoArgentina Evento',
        },
      });

      return {
        preferenceId: preferenceResponse.id,
        initPoint:
          preferenceResponse.init_point ||
          preferenceResponse.sandbox_init_point,
        externalReference: preferenceResponse.external_reference,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error al crear preferencia de pago de inscripción: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'No se pudo crear la preferencia de pago',
      );
    }
  }

  async processWebhook(webhookData: WebhookData) {
    const rawId = webhookData?.data?.id;
    if (typeof rawId !== 'string' && typeof rawId !== 'number') {
      return { processed: false };
    }

    const paymentId = String(rawId);
    const action = webhookData.action;

    if (action !== 'payment.created' && action !== 'payment.updated') {
      return { processed: false };
    }

    // Idempotencia persistente: sobrevive reinicios (el Set en memoria no).
    if (await this.yaProcesado(paymentId)) {
      this.logger.log(`Pago ${paymentId} ya fue procesado (idempotencia)`);
      return { processed: true, idempotent: true };
    }

    try {
      const paymentClient = new Payment(this.client);
      const payment = await paymentClient.get({ id: paymentId });

      if (payment.status !== 'approved') {
        return { processed: false };
      }

      const reference = payment.external_reference;
      if (!reference) {
        return { processed: false };
      }

      let resultado: { processed: boolean };
      if (reference.startsWith('fee_user_')) {
        resultado = await this.processFeePayment(paymentId, reference);
      } else if (reference.startsWith('inscripcion_user_')) {
        resultado = await this.processInscriptionPayment(paymentId, reference);
      } else if (reference.startsWith('reimpresion_user_')) {
        resultado = await this.processReimpresionPayment(paymentId, reference);
      } else {
        return { processed: false };
      }

      if (resultado.processed) {
        // Carrera entre dos webhooks simultáneos: el unique lo resuelve.
        const registro = await this.registrarPago(paymentId, reference);
        if (registro === 'duplicado') {
          return { processed: true, idempotent: true };
        }
      }
      return resultado;
    } catch (error: unknown) {
      this.logger.error(
        `Error al consultar pago ${paymentId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { processed: false };
    }
  }

  private async yaProcesado(paymentId: string): Promise<boolean> {
    const existente = await this.prisma.pagoProcesado.findUnique({
      where: { mp_payment_id: paymentId },
    });
    return existente !== null;
  }

  private async registrarPago(
    paymentId: string,
    reference: string,
  ): Promise<'ok' | 'duplicado'> {
    const tipo = reference.startsWith('fee_user_')
      ? 'fee'
      : reference.startsWith('inscripcion_user_')
        ? 'inscripcion'
        : 'reimpresion';
    try {
      await this.prisma.pagoProcesado.create({
        data: { mp_payment_id: paymentId, tipo, referencia: reference },
      });
      return 'ok';
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        return 'duplicado';
      }
      throw err;
    }
  }

  private async processFeePayment(paymentId: string, reference: string) {
    const match = reference.match(/fee_user_(\d+)_ts_\d+/);
    if (!match) return { processed: false };

    const userId = parseInt(match[1]);
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) return { processed: false };

    if (user.estado_pago) {
      return { processed: true, alreadyPaid: true };
    }

    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        estado_pago: true,
        estado_reg: 'APROBADO',
      },
    });

    return {
      processed: true,
      userId,
      statusUpdated: true,
    };
  }

  private async processInscriptionPayment(
    paymentId: string,
    reference: string,
  ) {
    const match = reference.match(
      /inscripcion_user_(\d+)_evento_(\d+)_insc_(\d+)_ts_\d+/,
    );
    if (!match) return { processed: false };

    const userId = parseInt(match[1]);
    const eventoId = parseInt(match[2]);
    const inscripcionId = parseInt(match[3]);

    const inscripcion = await this.prisma.inscripcionEvento.findUnique({
      where: { id: inscripcionId },
    });

    if (!inscripcion) return { processed: false };
    if (inscripcion.usuario_id !== userId) return { processed: false };
    if (inscripcion.evento_id !== eventoId) return { processed: false };
    if (inscripcion.pagado) {
      return { processed: true, alreadyPaid: true };
    }

    await this.prisma.inscripcionEvento.update({
      where: { id: inscripcionId },
      data: { pagado: true, estado_aprob: 'APROBADO' },
    });

    return {
      processed: true,
      userId,
      inscripcionId,
      statusUpdated: true,
    };
  }

  private async processReimpresionPayment(
    paymentId: string,
    reference: string,
  ) {
    const match = reference.match(/reimpresion_user_(\d+)_reimp_(\d+)_ts_\d+/);
    if (!match) return { processed: false };

    const userId = parseInt(match[1]);
    const reimpresionId = parseInt(match[2]);

    const reimpresion = await this.prisma.reimpresionDiploma.findUnique({
      where: { id: reimpresionId },
    });

    if (!reimpresion) return { processed: false };
    if (reimpresion.usuario_id !== userId) return { processed: false };
    if (reimpresion.pagado) {
      return { processed: true, alreadyPaid: true };
    }

    await this.prisma.reimpresionDiploma.update({
      where: { id: reimpresionId },
      data: {
        pagado: true,
        mp_payment_id: paymentId,
      },
    });

    return {
      processed: true,
      userId,
      reimpresionId,
      statusUpdated: true,
    };
  }

  async createReimpresionPreference(
    userId: number,
    userEmail: string,
    amount: number,
    reimpresionId: number,
  ) {
    const externalReference = `reimpresion_user_${userId}_reimp_${reimpresionId}_ts_${Date.now()}`;

    if (this.isSimulated) {
      return {
        preferenceId: `sim_${externalReference}`,
        initPoint:
          'https://simulacion.mercadopago.com/checkout/v1/preferences/sim',
        externalReference,
        simulated: true,
      };
    }

    const preferenceClient = new Preference(this.client);
    const appUrl = this.configService.get<string>('APP_URL');

    try {
      const preferenceResponse = await preferenceClient.create({
        body: {
          items: [
            {
              id: `reimp_${reimpresionId}`,
              title: 'Reimpresión de Diploma',
              quantity: 1,
              unit_price: amount,
            },
          ],
          payer: { email: userEmail },
          back_urls: {
            success: `${appUrl}/pagos/exito`,
            pending: `${appUrl}/pagos/pending`,
            failure: `${appUrl}/pagos/error`,
          },
          external_reference: externalReference,
          notification_url: `${appUrl}/api/pagos/webhook`,
          auto_return: 'approved',
          payment_methods: {
            excluded_payment_types: [{ id: 'credit_card' }],
          },
          statement_descriptor: 'KendoArgentina Reimp',
        },
      });

      return {
        preferenceId: preferenceResponse.id,
        initPoint:
          preferenceResponse.init_point ||
          preferenceResponse.sandbox_init_point,
        externalReference: preferenceResponse.external_reference,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error al crear preferencia de reimpresión: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'No se pudo crear la preferencia de pago',
      );
    }
  }

  async getUserStatus(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        estado_pago: true,
        estado_reg: true,
      },
    });

    return user || null;
  }

  async simulatePayment(
    externalReference: string,
    status: 'approved' | 'rejected' = 'approved',
  ) {
    if (!this.isSimulated) {
      throw new InternalServerErrorException('Modo simulado no habilitado');
    }

    if (status !== 'approved') {
      return {
        success: false,
        processed: false,
        message: 'Solo pagos aprobados se procesan',
      };
    }

    const fakePaymentId = `sim_${Date.now()}`;

    let resultado: { processed: boolean };
    if (externalReference.startsWith('fee_user_')) {
      resultado = await this.processFeePayment(
        fakePaymentId,
        externalReference,
      );
    } else if (externalReference.startsWith('inscripcion_user_')) {
      resultado = await this.processInscriptionPayment(
        fakePaymentId,
        externalReference,
      );
    } else if (externalReference.startsWith('reimpresion_user_')) {
      resultado = await this.processReimpresionPayment(
        fakePaymentId,
        externalReference,
      );
    } else {
      return {
        success: false,
        processed: false,
        message: 'Referencia externa inválida',
      };
    }

    if (resultado.processed) {
      await this.registrarPago(fakePaymentId, externalReference);
      return { ...resultado, success: true };
    }
    return {
      success: false,
      processed: false,
      message: 'Referencia externa inválida',
    };
  }
}
