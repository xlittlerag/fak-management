import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createTestApp, cleanupDb, createTestUser, createAdminGeneral } from './test-utils';

describe('Dojos (e2e)', () => {
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

  describe('GET /dojos/asociacion/:id', () => {
    it('should be public (no auth required)', async () => {
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test' } });
      await prisma.dojo.create({ data: { nombre: 'Dojo 1', asociacion_id: assoc.id } });

      await request(app.getHttpServer())
        .get(`/api/dojos/asociacion/${assoc.id}`)
        .expect(200);
    });

    it('should return dojos for the association and exclude soft-deleted', async () => {
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test' } });
      const d1 = await prisma.dojo.create({ data: { nombre: 'Activo', asociacion_id: assoc.id } });
      const d2 = await prisma.dojo.create({ data: { nombre: 'Eliminado', asociacion_id: assoc.id, deleted_at: new Date() } });

      const response = await request(app.getHttpServer())
        .get(`/api/dojos/asociacion/${assoc.id}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(d1.id);
    });

    it('should return empty array for association with no dojos', async () => {
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Empty' } });

      const response = await request(app.getHttpServer())
        .get(`/api/dojos/asociacion/${assoc.id}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('POST /dojos', () => {
    it('should create a dojo when provided with a valid association_id', async () => {
      const admin = await createTestUser(prisma, jwt, { rol: 'ADMIN_GENERAL' });
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Nueva Asociacion' } });

      await request(app.getHttpServer())
        .post('/api/dojos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ nombre: 'Nuevo Dojo', asociacion_id: assoc.id })
        .expect(201);
    });

    it('should return 403 for BASICO user', async () => {
      const { token } = await createTestUser(prisma, jwt, { rol: 'BASICO' });
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Nueva' } });

      await request(app.getHttpServer())
        .post('/api/dojos')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Nuevo Dojo', asociacion_id: assoc.id })
        .expect(403);
    });
  });

  describe('PATCH /dojos/:id', () => {
    it('should update dojo name', async () => {
      const { token } = await createAdminGeneral(prisma, jwt);
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test' } });
      const dojo = await prisma.dojo.create({ data: { nombre: 'Viejo', asociacion_id: assoc.id } });

      const response = await request(app.getHttpServer())
        .patch(`/api/dojos/${dojo.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Nuevo Nombre' })
        .expect(200);

      expect(response.body.nombre).toBe('Nuevo Nombre');
    });

    it('should return 404 for non-existent dojo', async () => {
      const { token } = await createAdminGeneral(prisma, jwt);

      await request(app.getHttpServer())
        .patch(`/api/dojos/99999`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Nuevo' })
        .expect(404);
    });
  });

  describe('DELETE /dojos/:id', () => {
    it('should return 400 when deleting a dojo with practitioners', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Federacion' } });
      const dojo = await prisma.dojo.create({ data: { nombre: 'Dojo de prueba', asociacion_id: assoc.id } });
      
      await createTestUser(prisma, jwt, { 
        dni: 'practitioner1',
        asociacion_id: assoc.id, 
        dojo_id: dojo.id 
      });

      await request(app.getHttpServer())
        .delete(`/api/dojos/${dojo.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(400);
    });

    it('should soft-delete a dojo with no practitioners', async () => {
      const { token } = await createAdminGeneral(prisma, jwt);
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test' } });
      const dojo = await prisma.dojo.create({ data: { nombre: 'ABorrar', asociacion_id: assoc.id } });

      await request(app.getHttpServer())
        .delete(`/api/dojos/${dojo.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const deleted = await prisma.dojo.findUnique({ where: { id: dojo.id } });
      expect(deleted?.deleted_at).not.toBeNull();
    });

    it('should return 404 for non-existent dojo', async () => {
      const { token } = await createAdminGeneral(prisma, jwt);

      await request(app.getHttpServer())
        .delete(`/api/dojos/99999`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
