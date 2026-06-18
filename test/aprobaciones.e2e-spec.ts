import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createTestApp, cleanupDb, createTestUser } from './test-utils';

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

      const adminGeneral = await createTestUser(prisma, jwt, { rol: 'ADMIN_GENERAL' });

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
  });

  describe('Gestion Global (ADMIN_GENERAL)', () => {
    it('GET /usuarios should return all users', async () => {
      const admin = await createTestUser(prisma, jwt, { rol: 'ADMIN_GENERAL' });
      await createTestUser(prisma, jwt, { email: 'u1@ex.com' });
      await createTestUser(prisma, jwt, { email: 'u2@ex.com' });

      const response = await request(app.getHttpServer())
        .get('/api/usuarios')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      // 3 users: the admin and the 2 created
      expect(response.body.length).toBeGreaterThanOrEqual(3);
    });

    it('PATCH /usuarios/:id/rol should update user role', async () => {
      const admin = await createTestUser(prisma, jwt, { rol: 'ADMIN_GENERAL' });
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
  });
});
