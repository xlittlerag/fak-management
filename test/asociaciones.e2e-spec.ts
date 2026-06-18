import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createTestApp, cleanupDb, createTestUser } from './test-utils';

describe('Asociaciones (e2e)', () => {
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
    await app.close();
  });

  describe('GET /asociaciones', () => {
    it('should return 200 and a list of associations (public)', async () => {
      await prisma.asociacion.createMany({
        data: [{ nombre: 'Asociacion 1' }, { nombre: 'Asociacion 2' }],
      });

      const response = await request(app.getHttpServer())
        .get('/api/asociaciones')
        .expect(200);


      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('nombre');
    });
  });

  describe('POST /asociaciones', () => {
    it('should return 401 if no token provided', async () => {
      await request(app.getHttpServer())
        .post('/api/asociaciones')
        .send({ nombre: 'Nueva' })
        .expect(401);
    });

    it('should return 403 if user is not ADMIN_GENERAL', async () => {
      const { token } = await createTestUser(prisma, jwt, { rol: 'BASICO' });

      await request(app.getHttpServer())
        .post('/api/asociaciones')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Nueva' })
        .expect(403);
    });

    it('should return 201 if user is ADMIN_GENERAL', async () => {
      const { token } = await createTestUser(prisma, jwt, { rol: 'ADMIN_GENERAL' });

      const response = await request(app.getHttpServer())
        .post('/api/asociaciones')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Asociación Akitsu' })
        .expect(201);

      expect(response.body.nombre).toBe('Asociación Akitsu');
      
      const created = await prisma.asociacion.findFirst({
        where: { nombre: 'Asociación Akitsu' },
      });
      expect(created).toBeDefined();
    });
  });

  describe('PATCH /asociaciones/:id', () => {
    it('should update name and return 200 if ADMIN_GENERAL', async () => {
      const { token } = await createTestUser(prisma, jwt, { rol: 'ADMIN_GENERAL' });
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Antiguo' } });

      const response = await request(app.getHttpServer())
        .patch(`/api/asociaciones/${assoc.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Nuevo Nombre' })
        .expect(200);

      expect(response.body.nombre).toBe('Nuevo Nombre');
    });
  });

  describe('DELETE /asociaciones/:id', () => {
    it('should soft-delete and return 200 if ADMIN_GENERAL', async () => {
      const { token } = await createTestUser(prisma, jwt, { rol: 'ADMIN_GENERAL' });
      const assoc = await prisma.asociacion.create({ data: { nombre: 'ABorrar' } });

      await request(app.getHttpServer())
        .delete(`/api/asociaciones/${assoc.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const deleted = await prisma.asociacion.findUnique({ where: { id: assoc.id } });
      expect(deleted).not.toBeNull();
      expect(deleted?.deleted_at).not.toBeNull();
      
      const all = await prisma.asociacion.findMany({ where: { deleted_at: null } });
      expect(all.find(a => a.id === assoc.id)).toBeUndefined();
    });
  });
});
