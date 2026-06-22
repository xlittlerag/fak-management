import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createTestApp, cleanupDb, createTestUser, createAdminGeneral } from './test-utils';

describe('Admin Features (e2e)', () => {
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

  describe('Listado de Miembros (GET /usuarios)', () => {
    it('ADMIN_ASOCIACION should only see members of their association', async () => {
      const assocA = await prisma.asociacion.create({ data: { nombre: 'Assoc A' } });
      const assocB = await prisma.asociacion.create({ data: { nombre: 'Assoc B' } });

      const adminA = await createTestUser(prisma, jwt, { 
        rol: 'ADMIN_ASOCIACION', 
        asociacion_id: assocA.id 
      });

      await createTestUser(prisma, jwt, { email: 'memberA@test.com', asociacion_id: assocA.id });
      await createTestUser(prisma, jwt, { email: 'memberB@test.com', asociacion_id: assocB.id });

      const response = await request(app.getHttpServer())
        .get('/api/usuarios')
        .set('Authorization', `Bearer ${adminA.token}`)
        .expect(200);

      // Should see only memberA and themselves (if they belong to the same assoc)
      expect(response.body.every((u: any) => u.asociacion_id === assocA.id)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Configuración de Cuota (PATCH/GET /admin/fee)', () => {
    it('debería crear configuración inicial de cuota federativa', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const response = await request(app.getHttpServer())
        .patch('/api/admin/fee')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          monto_actual: 15000.00,
          fecha_vencimiento: '2026-12-31T23:59:59Z',
        })
        .expect(200);

      expect(response.body).toHaveProperty('monto_actual', 15000.00);
      expect(response.body).toHaveProperty('fecha_vencimiento');
    });

    it('debería actualizar monto y fecha de vencimiento', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      // First create
      await request(app.getHttpServer())
        .patch('/api/admin/fee')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          monto_actual: 15000.00,
          fecha_vencimiento: '2026-12-31T23:59:59Z',
        })
        .expect(200);

      // Then update
      const response = await request(app.getHttpServer())
        .patch('/api/admin/fee')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          monto_actual: 16000.00,
          fecha_vencimiento: '2026-12-31T23:59:59Z',
        })
        .expect(200);

      expect(response.body.monto_actual).toBe(16000.00);
    });

    it('debería rechazar configuración sin fecha de vencimiento', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      await request(app.getHttpServer())
        .patch('/api/admin/fee')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          monto_actual: 15000.00,
        })
        .expect(400);
    });

    it('debería permitir consultar configuración actual', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      // Seed first
      await request(app.getHttpServer())
        .patch('/api/admin/fee')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          monto_actual: 15000.00,
          fecha_vencimiento: '2026-12-31T23:59:59Z',
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/admin/fee')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('monto_actual');
      expect(response.body).toHaveProperty('fecha_vencimiento');
    });

    it('debería retornar mensajes de error en español formal', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const response = await request(app.getHttpServer())
        .patch('/api/admin/fee')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          monto_actual: 15000.00,
        })
        .expect(400);

      expect(response.body.message).toContain('fecha de vencimiento');
      expect(response.body.message).toMatch(/la|La/);
    });
  });

  describe('Asignación de Graduación (PATCH /usuarios/:id/graduacion)', () => {
    it('ADMIN_GENERAL should assign graduations', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt, { email: 'user@test.com' });

      const gradData = {
        grad_kendo: '1_DAN',
        f_grad_kendo: '2023-01-01',
        grad_iaido: '3_KYU',
        f_grad_iaido: '2022-06-15'
      };

      await request(app.getHttpServer())
        .patch(`/api/usuarios/${user.user.id}/graduacion`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send(gradData)
        .expect(200);

      const updated = await prisma.usuario.findUnique({ where: { id: user.user.id } });
      expect(updated?.grad_kendo).toBe('DAN_1'); // Prisma enum maps to DAN_1
      expect(updated?.grad_iaido).toBe('KYU_3');
      expect(updated?.f_grad_kendo?.toISOString().split('T')[0]).toBe('2023-01-01');
    });

    it('ADMIN_ASOCIACION should NOT be able to assign graduations', async () => {
      const adminAsoc = await createTestUser(prisma, jwt, { rol: 'ADMIN_ASOCIACION' });
      const user = await createTestUser(prisma, jwt, { email: 'user@test.com' });

      await request(app.getHttpServer())
        .patch(`/api/usuarios/${user.user.id}/graduacion`)
        .set('Authorization', `Bearer ${adminAsoc.token}`)
        .send({ grad_kendo: '1_DAN' })
        .expect(403);
    });
  });
});
