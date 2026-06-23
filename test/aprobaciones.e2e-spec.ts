import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createTestApp, cleanupDb, createTestUser, createAdminGeneral } from './test-utils';

describe('Aprobaciones (e2e)', () => {
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

  describe('GET /usuarios/pendientes', () => {
    it('should return 200 and only pending users from the same association for ADMIN_ASOCIACION', async () => {
      const assocA = await prisma.asociacion.create({ data: { nombre: 'Assoc A' } });
      const assocB = await prisma.asociacion.create({ data: { nombre: 'Assoc B' } });

      const adminA = await createTestUser(prisma, jwt, { 
        rol: 'ADMIN_ASOCIACION', 
        asociacion_id: assocA.id 
      });

      // Pending user in Assoc A
      await createTestUser(prisma, jwt, { 
        email: 'pendingA@example.com', 
        estado_reg: 'PENDIENTE_APROBACION', 
        asociacion_id: assocA.id 
      });

      // Pending user in Assoc B
      await createTestUser(prisma, jwt, { 
        email: 'pendingB@example.com', 
        estado_reg: 'PENDIENTE_APROBACION', 
        asociacion_id: assocB.id 
      });

      const response = await request(app.getHttpServer())
        .get('/api/usuarios/pendientes')
        .set('Authorization', `Bearer ${adminA.token}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].email).toBe('pendingA@example.com');
    });

    it('should return 200 and all pending users for ADMIN_GENERAL', async () => {
      const assocA = await prisma.asociacion.create({ data: { nombre: 'Assoc A' } });
      const assocB = await prisma.asociacion.create({ data: { nombre: 'Assoc B' } });

      const adminGeneral = await createAdminGeneral(prisma, jwt);

      await createTestUser(prisma, jwt, { email: 'p1@ex.com', estado_reg: 'PENDIENTE_APROBACION', asociacion_id: assocA.id });
      await createTestUser(prisma, jwt, { email: 'p2@ex.com', estado_reg: 'PENDIENTE_APROBACION', asociacion_id: assocB.id });

      const response = await request(app.getHttpServer())
        .get('/api/usuarios/pendientes')
        .set('Authorization', `Bearer ${adminGeneral.token}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('PATCH /usuarios/:id/aprobacion', () => {
    it('should return 403 if ADMIN_ASOCIACION tries to approve user from another association', async () => {
      const assocA = await prisma.asociacion.create({ data: { nombre: 'Assoc A' } });
      const assocB = await prisma.asociacion.create({ data: { nombre: 'Assoc B' } });

      const adminA = await createTestUser(prisma, jwt, { rol: 'ADMIN_ASOCIACION', asociacion_id: assocA.id });
      const userB = await createTestUser(prisma, jwt, { email: 'userB@ex.com', estado_reg: 'PENDIENTE_APROBACION', asociacion_id: assocB.id });

      await request(app.getHttpServer())
        .patch(`/api/usuarios/${userB.user.id}/aprobacion`)
        .set('Authorization', `Bearer ${adminA.token}`)
        .send({ accion: 'APROBAR' })
        .expect(403);
    });

    it('should return 200 and change status to APROBADO', async () => {
      const assocA = await prisma.asociacion.create({ data: { nombre: 'Assoc A' } });
      const adminA = await createTestUser(prisma, jwt, { rol: 'ADMIN_ASOCIACION', asociacion_id: assocA.id });
      const userA = await createTestUser(prisma, jwt, { email: 'userA@ex.com', estado_reg: 'PENDIENTE_APROBACION', asociacion_id: assocA.id });

      await request(app.getHttpServer())
        .patch(`/api/usuarios/${userA.user.id}/aprobacion`)
        .set('Authorization', `Bearer ${adminA.token}`)
        .send({ accion: 'APROBAR' })
        .expect(200);

      const updated = await prisma.usuario.findUnique({ where: { id: userA.user.id } });
      expect(updated?.estado_reg).toBe('APROBADO');
    });

    it('should return 200 and change status to RECHAZADO', async () => {
      const assocA = await prisma.asociacion.create({ data: { nombre: 'Assoc A' } });
      const adminA = await createTestUser(prisma, jwt, { rol: 'ADMIN_ASOCIACION', asociacion_id: assocA.id });
      const userA = await createTestUser(prisma, jwt, { email: 'reject@ex.com', estado_reg: 'PENDIENTE_APROBACION', asociacion_id: assocA.id });

      await request(app.getHttpServer())
        .patch(`/api/usuarios/${userA.user.id}/aprobacion`)
        .set('Authorization', `Bearer ${adminA.token}`)
        .send({ accion: 'RECHAZAR' })
        .expect(200);

      const updated = await prisma.usuario.findUnique({ where: { id: userA.user.id } });
      expect(updated?.estado_reg).toBe('RECHAZADO');
    });

    it('should return 404 for non-existent user', async () => {
      const { token } = await createAdminGeneral(prisma, jwt);

      await request(app.getHttpServer())
        .patch('/api/usuarios/99999/aprobacion')
        .set('Authorization', `Bearer ${token}`)
        .send({ accion: 'APROBAR' })
        .expect(404);
    });
  });

  describe('Gestion Global (ADMIN_GENERAL)', () => {
    it('GET /usuarios should return all approved users', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      await createTestUser(prisma, jwt, { email: 'u1@ex.com' });
      await createTestUser(prisma, jwt, { email: 'u2@ex.com' });

      const response = await request(app.getHttpServer())
        .get('/api/usuarios')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      // 2 users created (admin is no longer a user record)
      expect(response.body.length).toBe(2);
    });

    it('GET /usuarios should support pagination with skip/take', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      for (let i = 0; i < 5; i++) {
        await createTestUser(prisma, jwt, { email: `paginated${i}@ex.com`, dni: `PAG${i}` });
      }

      const response = await request(app.getHttpServer())
        .get('/api/usuarios?skip=2&take=2')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('PATCH /usuarios/:id/rol should update user role', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const targetUser = await createTestUser(prisma, jwt, { email: 'target@ex.com', rol: 'BASICO' });

      await request(app.getHttpServer())
        .patch(`/api/usuarios/${targetUser.user.id}/rol`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ rol: 'ADMIN_ASOCIACION' })
        .expect(200);

      const updated = await prisma.usuario.findUnique({ where: { id: targetUser.user.id } });
      expect(updated?.rol).toBe('ADMIN_ASOCIACION');
    });

    it('should return 403 if non-admin tries to list all users', async () => {
      const user = await createTestUser(prisma, jwt, { rol: 'BASICO' });
      await request(app.getHttpServer())
        .get('/api/usuarios')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(403);
    });

    it('should return 403 if BASICO tries to list pending users', async () => {
      const { token } = await createTestUser(prisma, jwt, { rol: 'BASICO' });

      await request(app.getHttpServer())
        .get('/api/usuarios/pendientes')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return 403 if ADMIN_ASOCIACION tries to change roles', async () => {
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test' } });
      const adminAsoc = await createTestUser(prisma, jwt, { rol: 'ADMIN_ASOCIACION', asociacion_id: assoc.id });
      const target = await createTestUser(prisma, jwt, { email: 'target@ex.com', asociacion_id: assoc.id });

      await request(app.getHttpServer())
        .patch(`/api/usuarios/${target.user.id}/rol`)
        .set('Authorization', `Bearer ${adminAsoc.token}`)
        .send({ rol: 'ADMIN_ASOCIACION' })
        .expect(403);
    });
  });
});
