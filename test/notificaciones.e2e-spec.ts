import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { NotificacionesService } from '../src/notificaciones/notificaciones.service';
import { createTestApp, cleanupDb, createTestUser, createAdminGeneral } from './test-utils';

describe('Notificaciones (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let notificaciones: NotificacionesService;

  beforeAll(async () => {
    ({ app, prisma, jwt } = await createTestApp());
    notificaciones = app.get(NotificacionesService);
  });

  beforeEach(async () => {
    await cleanupDb(prisma);
  });

  afterAll(async () => {
    await cleanupDb(prisma);
    await app.close();
  });

  describe('Registro de usuario', () => {
    it('debería enviar email de bienvenida al registrarse', async () => {
      const spy = jest.spyOn(notificaciones, 'sendWelcomeEmail').mockResolvedValue();

      const asociacion = await prisma.asociacion.create({ data: { nombre: 'Test' } });
      const dojo = await prisma.dojo.create({ data: { nombre: 'Dojo Test', asociacion_id: asociacion.id } });

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          nombre: 'Test',
          apellido: 'User',
          dni: `DNI-${Date.now()}`,
          fecha_nacimiento: '1990-01-01',
          sexo: 'MASCULINO',
          asociacion_id: asociacion.id,
          dojo_id: dojo.id,
          calle_altura: 'Calle 123',
          ciudad: 'Ciudad',
          provincia: 'BUENOS_AIRES',
          codigo_postal: '1234',
          telefono: '123456789',
        });

      expect(res.status).toBe(201);
      expect(spy).toHaveBeenCalledWith('test@example.com', 'Test');

      spy.mockRestore();
    });
  });

  describe('Solicitud de reseteo de contraseña', () => {
    it('debería enviar email con código de reseteo', async () => {
      const spy = jest.spyOn(notificaciones, 'sendPasswordResetEmail').mockResolvedValue();

      const { user } = await createTestUser(prisma, jwt, { email: 'reset@example.com' });

      const res = await request(app.getHttpServer())
        .post('/api/auth/reset-password/request')
        .send({ dni: user.dni });

      expect(res.status).toBe(201);
      expect(spy).toHaveBeenCalledWith('reset@example.com', 'Test', expect.any(String));

      spy.mockRestore();
    });
  });

  describe('Aprobación/rechazo de inscripción', () => {
    it('debería enviar email al aprobar una inscripción', async () => {
      const spy = jest.spyOn(notificaciones, 'sendInscripcionStatusEmail').mockResolvedValue();

      const admin = await createAdminGeneral(prisma, jwt);
      const { user: usuario, token: userToken } = await createTestUser(prisma, jwt);

      const eventoRes = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          ambito: 'REGIONAL',
          fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
          fecha_fin: new Date(Date.now() + 86400000).toISOString(),
          datos_lugar: { direccion: 'Test', provincia: 'BUENOS_AIRES' },
          disciplina: 'KENDO',
          costo_inscripcion: 100,
        });

      const eventoId = eventoRes.body.id;

      const inscRes = await request(app.getHttpServer())
        .post(`/api/eventos/${eventoId}/inscribir`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      const inscripcionId = inscRes.body.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/inscripciones/${inscripcionId}/aprobar`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ accion: 'APROBAR' });

      expect(res.status).toBe(200);
      expect(spy).toHaveBeenCalledWith(
        usuario.email,
        usuario.nombre,
        expect.stringContaining('SEMINARIO'),
        'APROBAR',
      );

      spy.mockRestore();
    });

    it('debería enviar email al rechazar una inscripción', async () => {
      const spy = jest.spyOn(notificaciones, 'sendInscripcionStatusEmail').mockResolvedValue();

      const admin = await createAdminGeneral(prisma, jwt);
      const { user: usuario, token: userToken } = await createTestUser(prisma, jwt);

      const eventoRes = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          ambito: 'REGIONAL',
          fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
          fecha_fin: new Date(Date.now() + 86400000).toISOString(),
          datos_lugar: { direccion: 'Test', provincia: 'BUENOS_AIRES' },
          disciplina: 'KENDO',
          costo_inscripcion: 100,
        });

      const inscRes = await request(app.getHttpServer())
        .post(`/api/eventos/${eventoRes.body.id}/inscribir`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      const res = await request(app.getHttpServer())
        .patch(`/api/inscripciones/${inscRes.body.id}/aprobar`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ accion: 'RECHAZAR' });

      expect(res.status).toBe(200);
      expect(spy).toHaveBeenCalledWith(
        usuario.email,
        usuario.nombre,
        expect.stringContaining('SEMINARIO'),
        'RECHAZAR',
      );

      spy.mockRestore();
    });
  });

  describe('Cambio de estado de certificación', () => {
    it('debería enviar email al rechazar certificación', async () => {
      const spy = jest.spyOn(notificaciones, 'sendCertificacionStatusEmail').mockResolvedValue();

      const admin = await createAdminGeneral(prisma, jwt);
      const { user: usuario } = await createTestUser(prisma, jwt, { email: 'cert@example.com' });

      // Create certificado directly in DB to avoid file upload issues
      const cert = await prisma.certificadoExterno.create({
        data: {
          usuario_id: usuario.id,
          url_archivo: '/uploads/test.pdf',
          disciplina: 'KENDO',
          grad_solicitada: 'DAN_1',
          estado: 'PENDIENTE',
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/certificados/${cert.id}/rechazar`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(spy).toHaveBeenCalledWith(
        'cert@example.com',
        expect.any(String),
        'KENDO',
        'RECHAZADO',
      );

      spy.mockRestore();
    });
  });

  describe('Sin configuración SMTP', () => {
    it('el servicio no debería lanzar error cuando no hay SMTP configurado', async () => {
      // NotificacionesService se crea con transporter=null cuando no hay SMTP_HOST
      // El método send no debe lanzar error
      await expect(
        notificaciones['send']({ to: 'test@test.com', subject: 'Test', html: '<p>test</p>' }),
      ).resolves.toBeUndefined();
    });
  });
});
