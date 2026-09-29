import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MercadoPagoService } from '../src/pagos/mercado-pago.service';
import {
  createTestApp,
  cleanupDb,
  createTestUser,
  createAdminGeneral,
} from './test-utils';
import { Payment } from 'mercadopago';
import { createHmac } from 'crypto';

process.env.MERCADO_PAGO_SIMULATED = 'true';

describe('Pagos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let mpService: MercadoPagoService;

  beforeAll(async () => {
    ({ app, prisma, jwt } = await createTestApp());

    mpService = app.get(MercadoPagoService);
    jest
      .spyOn(mpService, 'createFederativeFeePreference')
      .mockImplementation((userId: number) => ({
        preferenceId: `mp_test_${userId}_${Date.now()}`,
        initPoint: `https://mercadopago.com/checkout/v1/preferences/mp_test_${userId}`,
        externalReference: `fee_user_${userId}_ts_${Date.now()}`,
        paymentMethods: {
          excludedPaymentTypes: [{ id: 'credit_card' }],
        },
      }));

    jest.spyOn(Payment.prototype, 'get').mockResolvedValue({
      id: 'test_payment_default',
      status: 'pending',
      external_reference: 'test_ref',
    } as any);
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
      data: {
        monto_actual: 15000.0,
        fecha_vencimiento: new Date(Date.now() + 30 * 86400000),
      },
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

      const updatedUser = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.estado_pago).toBe(true);
      expect(updatedUser!.estado_reg).toBe('APROBADO');
    });

    it('repite webhook sin reacreditar (idempotencia persistente)', async () => {
      await seedFeeConfig();
      const { user } = await createTestUser(prisma, jwt);

      jest.spyOn(Payment.prototype, 'get').mockResolvedValue({
        id: 'test_payment_idem',
        status: 'approved',
        external_reference: `fee_user_${user.id}_ts_${Date.now()}`,
        date_approved: new Date().toISOString(),
      } as any);

      const cuerpo = {
        action: 'payment.updated',
        data: { id: 'test_payment_idem' },
      };
      const server = request(app.getHttpServer());
      const r1 = await server
        .post('/api/pagos/webhook')
        .send(cuerpo)
        .expect(200);
      expect(r1.body.processed).toBe(true);

      const r2 = await server
        .post('/api/pagos/webhook')
        .send(cuerpo)
        .expect(200);
      expect(r2.body.processed).toBe(true);

      const registros = await prisma.pagoProcesado.findMany({
        where: { mp_payment_id: 'test_payment_idem' },
      });
      expect(registros).toHaveLength(1);
    });

    it('debería ignorar webhook si el pago no está aprobado', async () => {
      jest.spyOn(Payment.prototype, 'get').mockResolvedValueOnce({
        id: 'test_payment_pending',
        status: 'pending',
        external_reference: 'fee_user_1_ts_123',
      } as any);

      const response = await request(app.getHttpServer())
        .post('/api/pagos/webhook')
        .send({
          action: 'payment.updated',
          data: { id: 'test_payment_pending' },
        })
        .expect(200);

      expect(response.body).toHaveProperty('processed', false);
    });

    describe('firma x-signature', () => {
      const SECRETO = 'webhook-secret-de-prueba';
      const DATA_ID = 'firma_test_1';
      const REQUEST_ID = 'req-123';

      function firmar(
        dataId: string,
        secreto: string,
      ): {
        xSignature: string;
        xRequestId: string;
      } {
        const ts = String(Math.floor(Date.now() / 1000));
        const manifiesto = `id:${dataId};request-id:${REQUEST_ID};ts:${ts};`;
        const v1 = createHmac('sha256', secreto)
          .update(manifiesto)
          .digest('hex');
        return { xSignature: `ts=${ts},v1=${v1}`, xRequestId: REQUEST_ID };
      }

      afterEach(() => {
        delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      });

      it('rechaza firma inválida con 401 cuando hay secreto configurado', async () => {
        process.env.MERCADO_PAGO_WEBHOOK_SECRET = SECRETO;

        await request(app.getHttpServer())
          .post('/api/pagos/webhook')
          .set('x-signature', 'ts=123,v1=00')
          .set('x-request-id', REQUEST_ID)
          .send({ action: 'payment.updated', data: { id: DATA_ID } })
          .expect(401);
      });

      it('rechaza sin cabeceras cuando hay secreto configurado', async () => {
        process.env.MERCADO_PAGO_WEBHOOK_SECRET = SECRETO;

        await request(app.getHttpServer())
          .post('/api/pagos/webhook')
          .send({ action: 'payment.updated', data: { id: DATA_ID } })
          .expect(401);
      });

      it('acepta firma válida', async () => {
        process.env.MERCADO_PAGO_WEBHOOK_SECRET = SECRETO;
        jest.spyOn(Payment.prototype, 'get').mockResolvedValueOnce({
          id: DATA_ID,
          status: 'pending',
          external_reference: 'fee_user_1_ts_123',
        } as any);
        const { xSignature, xRequestId } = firmar(DATA_ID, SECRETO);

        const response = await request(app.getHttpServer())
          .post('/api/pagos/webhook')
          .set('x-signature', xSignature)
          .set('x-request-id', xRequestId)
          .send({ action: 'payment.updated', data: { id: DATA_ID } })
          .expect(200);

        expect(response.body).toHaveProperty('received', true);
      });
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
        .send({
          monto_actual: 'no-un-numero',
          fecha_vencimiento: new Date(Date.now() + 30 * 86400000).toISOString(),
        })
        .expect(400);

      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('debería rechazar monto negativo', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const response = await request(app.getHttpServer())
        .patch('/api/admin/fee')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          monto_actual: -100,
          fecha_vencimiento: new Date(Date.now() + 30 * 86400000).toISOString(),
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/negativo/)]),
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
        .send({
          monto_actual: 15000,
          fecha_vencimiento: new Date(Date.now() + 30 * 86400000).toISOString(),
        })
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

      expect(response.body.initPoint).toMatch(
        /^(https?:\/\/)?mercadopago\.com\/checkout\/v1\/preferences/,
      );
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
        }),
      );
    });
  });

  describe('POST /pagos/simulate — modo simulado', () => {
    it('debería simular pago de cuota federativa (fee_user_)', async () => {
      await seedFeeConfig();
      const { user, token } = await createTestUser(prisma, jwt);

      const preferenceResponse = await request(app.getHttpServer())
        .post('/api/pagos/checkout-fee')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const externalReference = preferenceResponse.body.externalReference;

      const response = await request(app.getHttpServer())
        .post('/api/pagos/simulate')
        .send({ externalReference })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.processed).toBe(true);

      const updatedUser = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser!.estado_pago).toBe(true);
      expect(updatedUser!.estado_reg).toBe('APROBADO');
    });

    it('debería simular pago de inscripción (inscripcion_user_)', async () => {
      await seedFeeConfig();
      const { user } = await createTestUser(prisma, jwt);

      const evento = await prisma.evento.create({
        data: {
          tipo: 'TORNEO',
          fecha_inicio: new Date(Date.now() + 86400000),
          fecha_fin: new Date(Date.now() + 86400000 + 8 * 3600000),
          datos_lugar: { direccion: 'Test', provincia: 'BUENOS_AIRES' },
          torneo: {
            create: {
              costo_inscripcion: 5000,
              disciplina: 'KENDO',
              inscripcion_multiple: false,
              categorias: [],
            },
          },
        },
        include: { torneo: true },
      });

      const inscripcion = await prisma.inscripcionEvento.create({
        data: {
          usuario_id: user.id,
          evento_id: evento.id,
          estado_aprob: 'APROBADO',
          pagado: false,
          categoria_grad: ['General'],
          disciplinas: [],
        },
      });

      const externalReference = `inscripcion_user_${user.id}_evento_${evento.id}_insc_${inscripcion.id}_ts_${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post('/api/pagos/simulate')
        .send({ externalReference })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.processed).toBe(true);

      const updatedInscripcion = await prisma.inscripcionEvento.findUnique({
        where: { id: inscripcion.id },
      });
      expect(updatedInscripcion!.pagado).toBe(true);
      expect(updatedInscripcion!.estado_aprob).toBe('APROBADO');
    });

    it('debería simular pago de reimpresión (reimpresion_user_)', async () => {
      await seedFeeConfig();
      const { user } = await createTestUser(prisma, jwt);

      const diploma = await prisma.diplomaNacional.create({
        data: {
          usuario_id: user.id,
          disciplina: 'KENDO',
          graduacion: 'DAN_1',
          url_archivo: 'https://example.com/diploma.pdf',
        },
      });

      const reimpresion = await prisma.reimpresionDiploma.create({
        data: {
          usuario: { connect: { id: user.id } },
          diploma: { connect: { id: diploma.id } },
          pagado: false,
        },
      });

      const externalReference = `reimpresion_user_${user.id}_reimp_${reimpresion.id}_ts_${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post('/api/pagos/simulate')
        .send({ externalReference })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.processed).toBe(true);

      const updatedReimpresion = await prisma.reimpresionDiploma.findUnique({
        where: { id: reimpresion.id },
      });
      expect(updatedReimpresion!.pagado).toBe(true);
      expect(updatedReimpresion!.mp_payment_id).toContain('sim_');
    });

    it('debería rechazar referencia externa inválida', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pagos/simulate')
        .send({ externalReference: 'invalid_reference' })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.processed).toBe(false);
      expect(response.body.message).toBe('Referencia externa inválida');
    });

    it('debería rechazar sin externalReference', async () => {
      await request(app.getHttpServer())
        .post('/api/pagos/simulate')
        .send({})
        .expect(400);
    });

    it('bloquea simulate en producción aunque el flag esté activo', async () => {
      const previo = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        await request(app.getHttpServer())
          .post('/api/pagos/simulate')
          .send({ externalReference: 'fee_user_1_ts_123' })
          .expect(403);
      } finally {
        if (previo === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previo;
      }
    });
  });
});
