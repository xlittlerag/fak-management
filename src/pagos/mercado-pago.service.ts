import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import MercadoPago, { Preference, Payment } from 'mercadopago';

@Injectable()
export class MercadoPagoService {
  private client: any;
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
      throw new InternalServerErrorException({
        message: 'No se pudo crear la preferencia de pago',
        error: error.message,
      });
    }
  }

  async processWebhook(webhookData: any) {
    if (!webhookData || !webhookData.data || !webhookData.data.id) {
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
      if (!reference || !reference.startsWith('fee_user_')) {
        return { processed: false };
      }

      const userIdMatch = reference.match(/fee_user_(\d+)_ts_\d+/);
      if (!userIdMatch) {
        return { processed: false };
      }

      const userId = parseInt(userIdMatch[1]);
      const user = await this.prisma.usuario.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return { processed: false };
      }

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
    } catch (error) {
      this.logger.error(`Error al consultar pago ${paymentId}: ${error.message}`);
      return { processed: false };
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
