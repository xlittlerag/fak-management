import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createTestApp, cleanupDb, createTestUser, createAdminGeneral } from './test-utils';

describe('Auditoría (e2e)', () => {
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

  describe('Registro automático en operaciones CRUD', () => {
    it('debería registrar un CREATE al crear una asociación', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const res = await request(app.getHttpServer())
        .post('/api/asociaciones')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ nombre: 'Asociación Test Auditoría' });

      expect(res.status).toBe(201);

      const log = await prisma.auditLog.findFirst({
        where: { entidad: 'Asociacion', accion: 'CREATE' },
        orderBy: { created_at: 'desc' },
      });

      expect(log).not.toBeNull();
      expect(log!.entidad_id).toBe(res.body.id);
      expect(log!.usuario_id).toBe(admin.admin.id);
      expect(log!.datos_previos).toBeNull();
      expect(log!.datos_nuevos).not.toBeNull();
      expect(log!.ip).not.toBeNull();
    });

    it('debería registrar un UPDATE al modificar una asociación', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const createRes = await request(app.getHttpServer())
        .post('/api/asociaciones')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ nombre: 'Asociación Original' });

      const asociacionId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/asociaciones/${asociacionId}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ nombre: 'Asociación Modificada' });

      expect(res.status).toBe(200);

      const log = await prisma.auditLog.findFirst({
        where: { entidad: 'Asociacion', entidad_id: asociacionId, accion: 'UPDATE' },
        orderBy: { created_at: 'desc' },
      });

      expect(log).not.toBeNull();
      expect(log!.usuario_id).toBe(admin.admin.id);
      expect(log!.datos_previos).not.toBeNull();
      expect(log!.datos_nuevos).not.toBeNull();
      expect((log!.datos_nuevos as Record<string, unknown>).nombre).toBe('Asociación Modificada');
    });

    it('debería registrar un DELETE (soft) al eliminar una asociación', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const createRes = await request(app.getHttpServer())
        .post('/api/asociaciones')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ nombre: 'Asociación a Eliminar' });

      const asociacionId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .delete(`/api/asociaciones/${asociacionId}`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);

      const log = await prisma.auditLog.findFirst({
        where: { entidad: 'Asociacion', entidad_id: asociacionId, accion: 'UPDATE' },
        orderBy: { created_at: 'desc' },
      });

      expect(log).not.toBeNull();
      expect(log!.datos_previos).not.toBeNull();
      expect(log!.datos_nuevos).not.toBeNull();
      expect((log!.datos_nuevos as Record<string, unknown>).deleted_at).not.toBeNull();
    });
  });

  describe('Captura de contexto', () => {
    it('debería capturar IP y user-agent en el log', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const createRes = await request(app.getHttpServer())
        .post('/api/asociaciones')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ nombre: 'Test UA' });

      const asociacionId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/api/asociaciones/${asociacionId}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .set('User-Agent', 'TestAgent/1.0')
        .send({ nombre: 'Test' });

      const log = await prisma.auditLog.findFirst({
        where: { entidad: 'Asociacion', entidad_id: asociacionId, accion: 'UPDATE' },
        orderBy: { created_at: 'desc' },
      });

      expect(log).not.toBeNull();
      expect(log!.user_agent).toBe('TestAgent/1.0');
    });
  });

  describe('GET /admin/auditoria', () => {
    it('debería listar logs con paginación', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const res = await request(app.getHttpServer())
        .get('/api/admin/auditoria')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('datos');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('pagina');
      expect(res.body).toHaveProperty('total_paginas');
    });

    it('debería filtrar por entidad', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const createRes = await request(app.getHttpServer())
        .post('/api/asociaciones')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ nombre: 'Filtro Entidad' });

      const res = await request(app.getHttpServer())
        .get('/api/admin/auditoria?entidad=Asociacion')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.datos.length).toBeGreaterThan(0);
      res.body.datos.forEach((log: Record<string, unknown>) => {
        expect(log.entidad).toBe('Asociacion');
      });
    });

    it('debería filtrar por acción', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      await request(app.getHttpServer())
        .post('/api/asociaciones')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ nombre: 'Test Acción' });

      const res = await request(app.getHttpServer())
        .get('/api/admin/auditoria?accion=CREATE')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.datos.length).toBeGreaterThan(0);
      res.body.datos.forEach((log: Record<string, unknown>) => {
        expect(log.accion).toBe('CREATE');
      });
    });

    it('debería rechazar acceso sin autenticación', async () => {
      const res = await request(app.getHttpServer()).get('/api/admin/auditoria');

      expect(res.status).toBe(401);
    });

    it('debería rechazar acceso para rol BASICO', async () => {
      const user = await createTestUser(prisma, jwt);

      const res = await request(app.getHttpServer())
        .get('/api/admin/auditoria')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(403);
    });

    it('debería rechazar acceso para ADMIN_ASOCIACION', async () => {
      const adminUser = await createTestUser(prisma, jwt, { rol: 'ADMIN_ASOCIACION' });

      const res = await request(app.getHttpServer())
        .get('/api/admin/auditoria')
        .set('Authorization', `Bearer ${adminUser.token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /admin/auditoria/:id', () => {
    it('debería obtener detalle de un log', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const createRes = await request(app.getHttpServer())
        .post('/api/asociaciones')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ nombre: 'Detalle Test' });

      const log = await prisma.auditLog.findFirst({
        where: { entidad: 'Asociacion', accion: 'CREATE' },
        orderBy: { created_at: 'desc' },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/admin/auditoria/${log!.id}`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(log!.id);
      expect(res.body.entidad).toBe('Asociacion');
      expect(res.body.accion).toBe('CREATE');
    });
  });

  describe('Registro de edición de perfil', () => {
    it('debería registrar un UPDATE al editar datos personales', async () => {
      const user = await createTestUser(prisma, jwt);

      const res = await request(app.getHttpServer())
        .patch('/api/usuarios/perfil')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ nombre: 'Nombre Modificado', telefono: '123456789' });

      expect(res.status).toBe(200);

      const log = await prisma.auditLog.findFirst({
        where: { entidad: 'Usuario', entidad_id: user.user.id, accion: 'UPDATE' },
        orderBy: { created_at: 'desc' },
      });

      expect(log).not.toBeNull();
      expect(log!.usuario_id).toBe(user.user.id);

      const previos = log!.datos_previos as Record<string, unknown> | null;
      const nuevos = log!.datos_nuevos as Record<string, unknown> | null;
      expect(previos).not.toBeNull();
      expect(nuevos).not.toBeNull();
      expect((previos as Record<string, unknown>).nombre).toBe(user.user.nombre);
      expect((nuevos as Record<string, unknown>).nombre).toBe('Nombre Modificado');
    });

    it('no debería incluir el password en los logs de auditoría', async () => {
      const user = await createTestUser(prisma, jwt);

      await request(app.getHttpServer())
        .patch('/api/usuarios/perfil')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ password: 'NuevaPass123!', telefono: '123456789' });

      const log = await prisma.auditLog.findFirst({
        where: { entidad: 'Usuario', entidad_id: user.user.id, accion: 'UPDATE' },
        orderBy: { created_at: 'desc' },
      });

      expect(log).not.toBeNull();

      const previos = log!.datos_previos as Record<string, unknown> | null;
      const nuevos = log!.datos_nuevos as Record<string, unknown> | null;

      // password must not appear in either snapshot
      if (previos) expect(previos).not.toHaveProperty('password');
      if (nuevos) expect(nuevos).not.toHaveProperty('password');
    });
  });
});
