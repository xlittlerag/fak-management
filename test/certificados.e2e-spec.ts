import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MercadoPagoService } from '../src/pagos/mercado-pago.service';
import { createTestApp, cleanupDb, createTestUser, createAdminGeneral } from './test-utils';

describe('Certificados (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let mpService: MercadoPagoService;

  beforeAll(async () => {
    ({ app, prisma, jwt } = await createTestApp());
    mpService = app.get(MercadoPagoService);
    jest.spyOn(mpService, 'createInscriptionPreference').mockResolvedValue({
      preferenceId: 'mp_test',
      initPoint: 'https://test.mp.com',
      externalReference: 'test_ref',
    });
    jest.spyOn(mpService, 'createFederativeFeePreference').mockResolvedValue({
      preferenceId: 'mp_fee_test',
      initPoint: 'https://test.mp.com/fee',
      externalReference: 'fee_test_ref',
    });
    jest.spyOn(mpService, 'createReimpresionPreference').mockResolvedValue({
      preferenceId: 'mp_reimp_test',
      initPoint: 'https://test.mp.com/reimp',
      externalReference: 'reimp_test_ref',
    });
  });

  beforeEach(async () => {
    await cleanupDb(prisma);
  });

  afterAll(async () => {
    await cleanupDb(prisma);
    await app.close();
  });

  describe('POST /certificados', () => {
    it('debería crear una certificación externa', async () => {
      const { token } = await createTestUser(prisma, jwt);
      const res = await request(app.getHttpServer())
        .post('/api/certificados')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('test-content'), 'test.pdf')
        .field('disciplina', 'KENDO')
        .field('grad_solicitada', 'DAN_1');
      expect(res.status).toBe(201);
      expect(res.body.estado).toBe('PENDIENTE');
    });

    it('debería rechazar sin archivo', async () => {
      const { token } = await createTestUser(prisma, jwt);
      const res = await request(app.getHttpServer())
        .post('/api/certificados')
        .set('Authorization', `Bearer ${token}`)
        .field('disciplina', 'KENDO')
        .field('grad_solicitada', 'DAN_1');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /certificados', () => {
    it('debería listar solo los certificados del usuario BASICO', async () => {
      const user1 = await createTestUser(prisma, jwt);
      const user2 = await createTestUser(prisma, jwt);

      await request(app.getHttpServer())
        .post('/api/certificados')
        .set('Authorization', `Bearer ${user1.token}`)
        .attach('file', Buffer.from('test'), 'u1.pdf')
        .field('disciplina', 'KENDO')
        .field('grad_solicitada', 'DAN_1');

      await request(app.getHttpServer())
        .post('/api/certificados')
        .set('Authorization', `Bearer ${user2.token}`)
        .attach('file', Buffer.from('test'), 'u2.pdf')
        .field('disciplina', 'IAIDO')
        .field('grad_solicitada', 'DAN_2');

      const res = await request(app.getHttpServer())
        .get('/api/certificados')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].disciplina).toBe('KENDO');
    });

    it('debería listar todos los certificados de la asociación para ADMIN_ASOCIACION', async () => {
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test Assoc' } });
      const user1 = await createTestUser(prisma, jwt, { asociacion_id: assoc.id });
      const user2 = await createTestUser(prisma, jwt, { asociacion_id: assoc.id });
      const adminAssoc = await createTestUser(prisma, jwt, { asociacion_id: assoc.id, rol: 'ADMIN_ASOCIACION' });

      await request(app.getHttpServer())
        .post('/api/certificados')
        .set('Authorization', `Bearer ${user1.token}`)
        .attach('file', Buffer.from('test'), 'u1.pdf')
        .field('disciplina', 'KENDO')
        .field('grad_solicitada', 'DAN_1');

      await request(app.getHttpServer())
        .post('/api/certificados')
        .set('Authorization', `Bearer ${user2.token}`)
        .attach('file', Buffer.from('test'), 'u2.pdf')
        .field('disciplina', 'IAIDO')
        .field('grad_solicitada', 'DAN_2');

      const res = await request(app.getHttpServer())
        .get('/api/certificados')
        .set('Authorization', `Bearer ${adminAssoc.token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });
  });

  describe('PATCH /certificados/:id/aprobar-asociacion', () => {
    it('debería permitir aprobar a admin de la misma asociación', async () => {
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test' } });
      const user = await createTestUser(prisma, jwt, { asociacion_id: assoc.id });
      const admin = await createTestUser(prisma, jwt, { asociacion_id: assoc.id, rol: 'ADMIN_ASOCIACION' });

      const certRes = await request(app.getHttpServer())
        .post('/api/certificados')
        .set('Authorization', `Bearer ${user.token}`)
        .attach('file', Buffer.from('test'), 't.pdf')
        .field('disciplina', 'KENDO')
        .field('grad_solicitada', 'DAN_1');

      const res = await request(app.getHttpServer())
        .patch(`/api/certificados/${certRes.body.id}/aprobar-asociacion`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('APROBADO_ASOCIACION');
    });

    it('debería rechazar si no está pendiente', async () => {
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test' } });
      const user = await createTestUser(prisma, jwt, { asociacion_id: assoc.id });
      const admin = await createTestUser(prisma, jwt, { asociacion_id: assoc.id, rol: 'ADMIN_ASOCIACION' });

      const certRes = await request(app.getHttpServer())
        .post('/api/certificados')
        .set('Authorization', `Bearer ${user.token}`)
        .attach('file', Buffer.from('test'), 't.pdf')
        .field('disciplina', 'KENDO')
        .field('grad_solicitada', 'DAN_1');

      await request(app.getHttpServer())
        .patch(`/api/certificados/${certRes.body.id}/aprobar-asociacion`)
        .set('Authorization', `Bearer ${admin.token}`);

      const res = await request(app.getHttpServer())
        .patch(`/api/certificados/${certRes.body.id}/aprobar-asociacion`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /certificados/:id/aprobar-general', () => {
    it('debería aprobar definitivamente y actualizar graduación', async () => {
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test' } });
      const user = await createTestUser(prisma, jwt, { asociacion_id: assoc.id, grad_kendo: 'KYU_1' });
      const adminAssoc = await createTestUser(prisma, jwt, { asociacion_id: assoc.id, rol: 'ADMIN_ASOCIACION' });
      const adminGen = await createAdminGeneral(prisma, jwt);

      const certRes = await request(app.getHttpServer())
        .post('/api/certificados')
        .set('Authorization', `Bearer ${user.token}`)
        .attach('file', Buffer.from('test'), 't.pdf')
        .field('disciplina', 'KENDO')
        .field('grad_solicitada', 'DAN_1');

      await request(app.getHttpServer())
        .patch(`/api/certificados/${certRes.body.id}/aprobar-asociacion`)
        .set('Authorization', `Bearer ${adminAssoc.token}`);

      const res = await request(app.getHttpServer())
        .patch(`/api/certificados/${certRes.body.id}/aprobar-general`)
        .set('Authorization', `Bearer ${adminGen.token}`);

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('APROBADO');

      const updatedUser = await prisma.usuario.findUnique({ where: { id: user.user.id } });
      expect(updatedUser?.grad_kendo).toBe('DAN_1');

      const history = await prisma.historialGraduacion.findMany({ where: { usuario_id: user.user.id } });
      expect(history.length).toBe(1);
      expect(history[0].graduacion).toBe('DAN_1');
    });

    it('debería rechazar si no está APROBADO_ASOCIACION', async () => {
      const user = await createTestUser(prisma, jwt);
      const adminGen = await createAdminGeneral(prisma, jwt);

      const certRes = await request(app.getHttpServer())
        .post('/api/certificados')
        .set('Authorization', `Bearer ${user.token}`)
        .attach('file', Buffer.from('test'), 't.pdf')
        .field('disciplina', 'KENDO')
        .field('grad_solicitada', 'DAN_1');

      const res = await request(app.getHttpServer())
        .patch(`/api/certificados/${certRes.body.id}/aprobar-general`)
        .set('Authorization', `Bearer ${adminGen.token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /certificados/:id/rechazar', () => {
    it('debería rechazar una certificación', async () => {
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test' } });
      const user = await createTestUser(prisma, jwt, { asociacion_id: assoc.id });
      const admin = await createTestUser(prisma, jwt, { asociacion_id: assoc.id, rol: 'ADMIN_ASOCIACION' });

      const certRes = await request(app.getHttpServer())
        .post('/api/certificados')
        .set('Authorization', `Bearer ${user.token}`)
        .attach('file', Buffer.from('test'), 't.pdf')
        .field('disciplina', 'KENDO')
        .field('grad_solicitada', 'DAN_1');

      const res = await request(app.getHttpServer())
        .patch(`/api/certificados/${certRes.body.id}/rechazar`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('RECHAZADO');
    });
  });
});