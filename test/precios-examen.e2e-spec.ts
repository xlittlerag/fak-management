import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createTestApp, cleanupDb, createTestUser, createAdminGeneral } from './test-utils';

describe('PreciosExamen (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(async () => {
    ({ app, prisma, jwt } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanupDb(prisma);
  });

  afterAll(async () => {
    await cleanupDb(prisma);
    await app.close();
  });

  describe('GET /precios-examen', () => {
    it('debería listar precios vacíos inicialmente', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/precios-examen')
        .expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /precios-examen', () => {
    it('debería crear un precio como ADMIN_GENERAL', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const res = await request(app.getHttpServer())
        .post('/api/precios-examen')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ graduacion: 'DAN_1', costo: 5000 })
        .expect(201);
      expect(res.body.graduacion).toBe('DAN_1');
      expect(res.body.costo).toBe(5000);
    });

    it('debería rechazar creación sin autenticación', async () => {
      await request(app.getHttpServer())
        .post('/api/precios-examen')
        .send({ graduacion: 'DAN_1', costo: 5000 })
        .expect(401);
    });

    it('debería rechazar creación para rol BASICO', async () => {
      const { token } = await createTestUser(prisma, jwt);
      await request(app.getHttpServer())
        .post('/api/precios-examen')
        .set('Authorization', `Bearer ${token}`)
        .send({ graduacion: 'DAN_1', costo: 5000 })
        .expect(403);
    });

    it('debería rechazar precio duplicado', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      await request(app.getHttpServer())
        .post('/api/precios-examen')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ graduacion: 'DAN_1', costo: 5000 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/precios-examen')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ graduacion: 'DAN_1', costo: 6000 })
        .expect(409);
    });
  });

  describe('PATCH /precios-examen/:id', () => {
    it('debería actualizar un precio', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const created = await request(app.getHttpServer())
        .post('/api/precios-examen')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ graduacion: 'KYU_1', costo: 3000 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/precios-examen/${created.body.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ costo: 3500 })
        .expect(200);

      expect(res.body.costo).toBe(3500);
    });
  });

  describe('DELETE /precios-examen/:id', () => {
    it('debería eliminar un precio', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const created = await request(app.getHttpServer())
        .post('/api/precios-examen')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ graduacion: 'DAN_2', costo: 7000 })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/precios-examen/${created.body.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
    });
  });
});
