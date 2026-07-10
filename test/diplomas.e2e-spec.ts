import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MercadoPagoService } from '../src/pagos/mercado-pago.service';
import { createTestApp, cleanupDb, createTestUser, createAdminGeneral } from './test-utils';

describe('Diplomas (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(async () => {
    ({ app, prisma, jwt } = await createTestApp());
    const mpService = app.get(MercadoPagoService);
    jest.spyOn(mpService, 'createReimpresionPreference').mockResolvedValue({
      preferenceId: 'mp_reimp_test',
      initPoint: 'https://test.mp.com/reimp',
      externalReference: 'reimp_test_ref',
    });
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
  });

  beforeEach(async () => {
    await cleanupDb(prisma);
  });

  afterAll(async () => {
    await cleanupDb(prisma);
    await app.close();
  });

  describe('POST /admin/diplomas', () => {
    it('debería crear un diploma nacional individual', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      const res = await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ url_archivo: '/uploads/diploma.pdf', usuario_id: user.user.id, disciplina: 'KENDO', graduacion: 'DAN_1' });

      expect(res.status).toBe(201);
      expect(res.body.disciplina).toBe('KENDO');
      expect(res.body.graduacion).toBe('DAN_1');
    });

    it('debería rechazar si no es ADMIN_GENERAL', async () => {
      const user = await createTestUser(prisma, jwt);
      const res = await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ url_archivo: '/uploads/d.pdf', usuario_id: user.user.id, disciplina: 'KENDO', graduacion: 'DAN_1' });
      expect(res.status).toBe(403);
    });

    it('debería vincular a inscripción aprobada y detectar duplicado', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      const eventoRes = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: '2027-07-01T00:00:00Z',
          fecha_fin: '2027-07-02T00:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          ambito: 'NACIONAL',
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: [{ disciplina: 'KENDO', grad_min: 'KYU_3', grad_max: 'DAN_8' }],
        });

      const inscRes = await request(app.getHttpServer())
        .post(`/api/eventos/${eventoRes.body.id}/inscribir`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ disciplinas: ['KENDO'] });

      await prisma.inscripcionEvento.update({
        where: { id: inscRes.body.id },
        data: { estado_aprob: 'APROBADO', pagado: true, categoria_grad: { KENDO: 'DAN_1' } },
      });

      const res1 = await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          url_archivo: '/uploads/d1.pdf',
          usuario_id: user.user.id,
          disciplina: 'KENDO',
          inscripcion_id: inscRes.body.id,
        });

      expect(res1.status).toBe(201);
      expect(res1.body.graduacion).toBe('DAN_1');

      const res2 = await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          url_archivo: '/uploads/d2.pdf',
          usuario_id: user.user.id,
          disciplina: 'KENDO',
          inscripcion_id: inscRes.body.id,
        });

      expect(res2.status).toBe(409);
    });
  });

  describe('POST /admin/diplomas/lote', () => {
    it('debería cargar diplomas por lote desde un evento', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user1 = await createTestUser(prisma, jwt);
      const user2 = await createTestUser(prisma, jwt);

      const eventoRes = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: '2026-08-01T00:00:00Z',
          fecha_fin: '2026-08-02T00:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          ambito: 'NACIONAL',
          disciplinas: ['KENDO', 'IAIDO'],
          graduaciones_a_rendir: [
            { disciplina: 'KENDO', grad_min: 'KYU_3', grad_max: 'DAN_8' },
            { disciplina: 'IAIDO', grad_min: 'KYU_3', grad_max: 'DAN_8' },
          ],
        });

      for (const u of [user1, user2]) {
        const inscRes = await request(app.getHttpServer())
          .post(`/api/eventos/${eventoRes.body.id}/inscribir`)
          .set('Authorization', `Bearer ${u.token}`)
          .send({ disciplinas: ['KENDO'] });

        await prisma.inscripcionEvento.update({
          where: { id: inscRes.body.id },
          data: { estado_aprob: 'APROBADO', pagado: true, categoria_grad: { KENDO: 'DAN_1' } },
        });
      }

      const res = await request(app.getHttpServer())
        .post('/api/admin/diplomas/lote')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          evento_id: eventoRes.body.id,
          archivos: [
            { usuario_id: user1.user.id, disciplina: 'KENDO', url_archivo: '/uploads/u1.pdf' },
            { usuario_id: user2.user.id, disciplina: 'KENDO', url_archivo: '/uploads/u2.pdf' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.created).toBe(2);
    });

    it('debería rechazar si el evento no tiene inscripciones aprobadas', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      const eventoRes = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: '2026-09-01T00:00:00Z',
          fecha_fin: '2026-09-02T00:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          ambito: 'NACIONAL',
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: [{ disciplina: 'KENDO', grad_min: 'KYU_3', grad_max: 'DAN_8' }],
        });

      const res = await request(app.getHttpServer())
        .post('/api/admin/diplomas/lote')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          evento_id: eventoRes.body.id,
          archivos: [
            { usuario_id: user.user.id, disciplina: 'KENDO', url_archivo: '/uploads/u.pdf' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.created).toBe(0);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('GET /admin/diplomas', () => {
    it('debería listar diplomas', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ url_archivo: '/uploads/d.pdf', usuario_id: user.user.id, disciplina: 'KENDO', graduacion: 'DAN_1' });

      await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ url_archivo: '/uploads/d2.pdf', usuario_id: user.user.id, disciplina: 'IAIDO', graduacion: 'DAN_2' });

      const res = await request(app.getHttpServer())
        .get('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });
  });

  describe('GET /mis-diplomas', () => {
    it('debería listar diplomas del usuario autenticado', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ url_archivo: '/uploads/d.pdf', usuario_id: user.user.id, disciplina: 'KENDO', graduacion: 'DAN_1' });

      const res = await request(app.getHttpServer())
        .get('/api/mis-diplomas')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].disciplina).toBe('KENDO');
    });
  });

  describe('Config endpoints', () => {
    it('GET /admin/diploma/config debería devolver precio', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const res = await request(app.getHttpServer())
        .get('/api/admin/diploma/config')
        .set('Authorization', `Bearer ${admin.token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('precio_reimpresion');
    });

    it('PATCH /admin/diploma/config debería actualizar precio', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const res = await request(app.getHttpServer())
        .patch('/api/admin/diploma/config')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ precio_reimpresion: 10000 });
      expect(res.status).toBe(200);
      expect(res.body.precio_reimpresion).toBe(10000);
    });
  });

  describe('POST /diplomas/reimprimir', () => {
    it('debería crear una solicitud de reimpresión', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ url_archivo: '/uploads/d.pdf', usuario_id: user.user.id, disciplina: 'KENDO', graduacion: 'DAN_1' });

      const res = await request(app.getHttpServer())
        .post('/api/diplomas/reimprimir')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ disciplina: 'KENDO' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('reimpresion_id');
      expect(res.body).toHaveProperty('preference');
    });

    it('debería rechazar si no tiene diploma de esa disciplina', async () => {
      const user = await createTestUser(prisma, jwt);
      const res = await request(app.getHttpServer())
        .post('/api/diplomas/reimprimir')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ disciplina: 'KENDO' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /admin/diploma/reimpresiones', () => {
    it('debería listar solicitudes de reimpresión', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ url_archivo: '/uploads/d.pdf', usuario_id: user.user.id, disciplina: 'KENDO', graduacion: 'DAN_1' });

      await request(app.getHttpServer())
        .post('/api/diplomas/reimprimir')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ disciplina: 'KENDO' });

      const res = await request(app.getHttpServer())
        .get('/api/admin/diploma/reimpresiones')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].usuario.id).toBe(user.user.id);
    });
  });
});
