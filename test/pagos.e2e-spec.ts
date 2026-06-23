import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MercadoPagoService } from '../src/pagos/mercado-pago.service';
import { createTestApp, cleanupDb, createTestUser, createAdminGeneral } from './test-utils';
import MercadoPago, { Payment } from 'mercadopago';

describe('Pagos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let mpService: MercadoPagoService;

  beforeAll(async () => {
    ({ app, prisma, jwt } = await createTestApp());

    mpService = app.get(MercadoPagoService);
    jest.spyOn(mpService, 'createFederativeFeePreference').mockImplementation(
      async (userId: number, userEmail: string, amount: number) => ({
        preferenceId: `mp_test_${userId}_${Date.now()}`,
        initPoint: `https://mercadopago.com/checkout/v1/preferences/mp_test_${userId}`,
        externalReference: `fee_user_${userId}_ts_${Date.now()}`,
        paymentMethods: {
          excludedPaymentTypes: [{ id: 'credit_card' }],
        },
      })
    );
  });

  beforeEach(async () => {
    await cleanupDb(prisma);
  });

  afterAll(async () => {
    await cleanupDb(prisma);
    await app.close();
  });

  async function seedFeeConfig() {
    await prisma.cuotaGlobal.create({
      data: { monto_actual: 15000.00, fecha_vencimiento: new Date('2026-12-31T23:59:59Z') },
    });
  }

  describe('POST /pagos/checkout-fee', () => {
    it('debería generar preferencia de checkout para pagar cuota', async () => {
      await seedFeeConfig();
      const { token } = await createTestUser(prisma, jwt);

      const response = await request(app.getHttpServer())
        .post('/api/pagos/checkout-fee')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('preferenceId');
      expect(response.body).toHaveProperty('initPoint');
      expect(response.body).toHaveProperty('externalReference');
    });

    it('debería rechazar generación sin autenticación', async () => {
      await request(app.getHttpServer())
        .post('/api/pagos/checkout-fee')
        .expect(401);
    });

    it('debería rechazar generación por usuario inactivo', async () => {
      await seedFeeConfig();
      const { token: inactiveToken } = await createTestUser(prisma, jwt, {
        estado_reg: 'PENDIENTE_APROBACION',
        estado_pago: false,
      });

      await request(app.getHttpServer())
        .post('/api/pagos/checkout-fee')
        .set('Authorization', `Bearer ${inactiveToken}`)
        .expect(403);
    });
  });

  describe('POST /pagos/webhook', () => {
    it('debería procesar pago aprobado y actualizar usuario', async () => {
      await seedFeeConfig();
      const { user, token } = await createTestUser(prisma, jwt);

      const preferenceResponse = await request(app.getHttpServer())
        .post('/api/pagos/checkout-fee')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const externalReference = preferenceResponse.body.externalReference;

      jest.spyOn(Payment.prototype, 'get').mockResolvedValueOnce({
        id: 'test_payment_id',
        status: 'approved',
        external_reference: externalReference,
        date_approved: new Date().toISOString(),
      } as any);

      const response = await request(app.getHttpServer())
        .post('/api/pagos/webhook')
        .send({
          action: 'payment.updated',
          data: { id: 'test_payment_id' },
        })
        .expect(200);

      expect(response.body).toHaveProperty('received', true);
      expect(response.body).toHaveProperty('processed', true);

      const updatedUser = await prisma.usuario.findUnique({ where: { id: user.id } });
      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.estado_pago).toBe(true);
      expect(updatedUser!.estado_reg).toBe('APROBADO');
    });

    it('debería ignorar webhook si el pago no está aprobado', async () => {
      jest.spyOn(Payment.prototype, 'get').mockResolvedValueOnce({
        id: 'test_payment_id',
        status: 'pending',
        external_reference: 'fee_user_1_ts_123',
      } as any);

      const response = await request(app.getHttpServer())
        .post('/api/pagos/webhook')
        .send({
          action: 'payment.updated',
          data: { id: 'test_payment_id' },
        })
        .expect(200);

      expect(response.body).toHaveProperty('processed', false);
    });
  });

  describe('Seguridad y Acceso', () => {
    it('debería ser @Public el endpoint de webhook', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pagos/webhook')
        .send({
          action: 'payment.created',
          data: { id: 1234567890 },
        })
        .expect(200);

      expect(response.body).toHaveProperty('received');
    });

    it('debería ser @Public el endpoint de webhook incluso con token inválido', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pagos/webhook')
        .set('Authorization', 'Bearer fake-token')
        .send({
          action: 'payment.created',
          data: { id: 1234567890 },
        })
        .expect(200);

      expect(response.body).toHaveProperty('received');
    });
  });

  describe('PATCH /admin/fee — validación de SetFeeDto', () => {
    it('debería rechazar monto no numérico', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const response = await request(app.getHttpServer())
        .patch('/api/admin/fee')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ monto_actual: 'no-un-numero', fecha_vencimiento: '2026-12-31' })
        .expect(400);

      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('debería rechazar monto negativo', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const response = await request(app.getHttpServer())
        .patch('/api/admin/fee')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ monto_actual: -100, fecha_vencimiento: '2026-12-31' })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/negativo/)])
      );
    });

    it('debería rechazar cuerpo vacío', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const response = await request(app.getHttpServer())
        .patch('/api/admin/fee')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({})
        .expect(400);

      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('debería rechazar configuración por usuario BASICO', async () => {
      const { token } = await createTestUser(prisma, jwt, { rol: 'BASICO' });

      await request(app.getHttpServer())
        .patch('/api/admin/fee')
        .set('Authorization', `Bearer ${token}`)
        .send({ monto_actual: 15000, fecha_vencimiento: '2026-12-31' })
        .expect(403);
    });
  });

  describe('Formato de preferencia de checkout', () => {
    it('debería generar preferencia con formato correcto en external_reference', async () => {
      await seedFeeConfig();
      const { token } = await createTestUser(prisma, jwt);

      const response = await request(app.getHttpServer())
        .post('/api/pagos/checkout-fee')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('preferenceId');
      expect(response.body).toHaveProperty('initPoint');
      expect(response.body).toHaveProperty('externalReference');

      const ref = response.body.externalReference;
      expect(ref).toMatch(/^fee_user_\d+_ts_\d+$/);
    });

    it('debería generar initPoint con formato de URL de Mercado Pago', async () => {
      await seedFeeConfig();
      const { token } = await createTestUser(prisma, jwt);

      const response = await request(app.getHttpServer())
        .post('/api/pagos/checkout-fee')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.initPoint).toMatch(/^(https?:\/\/)?mercadopago\.com\/checkout\/v1\/preferences/);
    });

    it('debería excluir tarjetas de crédito en las opciones de pago', async () => {
      await seedFeeConfig();
      const { token } = await createTestUser(prisma, jwt);

      const response = await request(app.getHttpServer())
        .post('/api/pagos/checkout-fee')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.paymentMethods).toBeDefined();
      expect(response.body.paymentMethods.excludedPaymentTypes).toBeDefined();
      expect(response.body.paymentMethods.excludedPaymentTypes).toContainEqual(
        expect.objectContaining({
          id: 'credit_card',
        })
      );
    });
  });
});
