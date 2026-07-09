import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import MercadoPago, { Preference, Payment } from 'mercadopago';

interface WebhookData {
  action?: string;
  data?: { id?: string | number };
}

@Injectable()
export class MercadoPagoService {
  private client: MercadoPago;
  private readonly processedPayments = new Set<string>();
  private readonly logger = new Logger(MercadoPagoService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.client = new MercadoPago({
      accessToken: this.configService.getOrThrow<string>('MERCADO_PAGO_ACCESS_TOKEN'),
      options: { timeout: 5000 },
    });
  }

  async createFederativeFeePreference(userId: number, userEmail: string, amount: number) {
    const preferenceClient = new Preference(this.client);
    const appUrl = this.configService.get<string>('APP_URL');

    const externalReference = `fee_user_${userId}_ts_${Date.now()}`;

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
          statement_descriptor: 'FAK - Cuota Federativa',
        },
      });

      return {
        preferenceId: preferenceResponse.id,
        initPoint: preferenceResponse.init_point || preferenceResponse.sandbox_init_point,
        externalReference: preferenceResponse.external_reference,
        paymentMethods: {
          excludedPaymentTypes: [
            {
              id: 'credit_card',
            },
          ],
        },
      };
    } catch (error) {
      this.logger.error(`Error al crear preferencia de pago: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'No se pudo crear la preferencia de pago',
      );
    }
  }

  async createInscriptionPreference(userId: number, userEmail: string, amount: number, inscripcionId: number, eventoId: number) {
    const preferenceClient = new Preference(this.client);
    const appUrl = this.configService.get<string>('APP_URL');

    const externalReference = `inscripcion_user_${userId}_evento_${eventoId}_insc_${inscripcionId}_ts_${Date.now()}`;

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
          statement_descriptor: 'FAK - Evento',
        },
      });

      return {
        preferenceId: preferenceResponse.id,
        initPoint: preferenceResponse.init_point || preferenceResponse.sandbox_init_point,
        externalReference: preferenceResponse.external_reference,
      };
    } catch (error) {
      this.logger.error(`Error al crear preferencia de pago de inscripción: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'No se pudo crear la preferencia de pago',
      );
    }
  }

  async processWebhook(webhookData: WebhookData) {
    if (!webhookData?.data?.id) {
      return { processed: false };
    }

    const paymentId = String(webhookData.data.id);
    const action = webhookData.action;

    if (action !== 'payment.created' && action !== 'payment.updated') {
      return { processed: false };
    }

    if (this.processedPayments.has(paymentId)) {
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

      if (reference.startsWith('fee_user_')) {
        return this.processFeePayment(paymentId, reference);
      }

      if (reference.startsWith('inscripcion_user_')) {
        return this.processInscriptionPayment(paymentId, reference);
      }

      if (reference.startsWith('reimpresion_user_')) {
        return this.processReimpresionPayment(paymentId, reference);
      }

      return { processed: false };
    } catch (error) {
      this.logger.error(`Error al consultar pago ${paymentId}: ${error.message}`);
      return { processed: false };
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
      this.processedPayments.add(paymentId);
      return { processed: true, alreadyPaid: true };
    }

    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        estado_pago: true,
        estado_reg: 'APROBADO',
      },
    });

    this.processedPayments.add(paymentId);

    return {
      processed: true,
      userId,
      statusUpdated: true,
    };
  }

  private async processInscriptionPayment(paymentId: string, reference: string) {
    const match = reference.match(/inscripcion_user_(\d+)_evento_(\d+)_insc_(\d+)_ts_\d+/);
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
      this.processedPayments.add(paymentId);
      return { processed: true, alreadyPaid: true };
    }

    await this.prisma.inscripcionEvento.update({
      where: { id: inscripcionId },
      data: { pagado: true, estado_aprob: 'APROBADO' },
    });

    this.processedPayments.add(paymentId);

    return {
      processed: true,
      userId,
      inscripcionId,
      statusUpdated: true,
    };
  }

  private async processReimpresionPayment(paymentId: string, reference: string) {
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
      this.processedPayments.add(paymentId);
      return { processed: true, alreadyPaid: true };
    }

    await this.prisma.reimpresionDiploma.update({
      where: { id: reimpresionId },
      data: {
        pagado: true,
        mp_payment_id: paymentId,
      },
    });

    this.processedPayments.add(paymentId);

    return {
      processed: true,
      userId,
      reimpresionId,
      statusUpdated: true,
    };
  }

  async createReimpresionPreference(userId: number, userEmail: string, amount: number, reimpresionId: number) {
    const preferenceClient = new Preference(this.client);
    const appUrl = this.configService.get<string>('APP_URL');

    const externalReference = `reimpresion_user_${userId}_reimp_${reimpresionId}_ts_${Date.now()}`;

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
          statement_descriptor: 'FAK - Reimpresión',
        },
      });

      return {
        preferenceId: preferenceResponse.id,
        initPoint: preferenceResponse.init_point || preferenceResponse.sandbox_init_point,
        externalReference: preferenceResponse.external_reference,
      };
    } catch (error) {
      this.logger.error(`Error al crear preferencia de reimpresión: ${error.message}`, error.stack);
      throw new InternalServerErrorException('No se pudo crear la preferencia de pago');
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
}
