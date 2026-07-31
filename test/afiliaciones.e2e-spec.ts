import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { NotificacionesService } from '../src/notificaciones/notificaciones.service';
import {
  createTestApp,
  cleanupDb,
  createTestUser,
  createAdminGeneral,
} from './test-utils';

describe('Afiliaciones (e2e)', () => {
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

  describe('Baja propia', () => {
    it('el socio solicita su baja → DESAFILIADO, rol BASICO y solicitud BAJA_SOCIO registrada', async () => {
      await prisma.configSistema.create({
        data: { fak_email: 'presidente@kendoargentina.org' },
      });
      const { user, token } = await createTestUser(prisma, jwt, {
        rol: 'ADMIN_ASOCIACION',
      });

      const spy = jest
        .spyOn(notificaciones, 'sendBajaInformadaFederacion')
        .mockResolvedValue();

      const res = await request(app.getHttpServer())
        .post('/api/afiliaciones/baja')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.estado_reg).toBe('DESAFILIADO');
      expect(res.body.rol).toBe('BASICO');

      const solicitud = await prisma.solicitudAfiliacion.findFirst({
        where: { usuario_id: user.id },
      });
      expect(solicitud).not.toBeNull();
      expect(solicitud?.tipo).toBe('BAJA_SOCIO');
      expect(solicitud?.estado).toBe('APROBADO');
      expect(spy).toHaveBeenCalledWith(
        'presidente@kendoargentina.org',
        expect.any(String),
        'Test Association',
      );

      spy.mockRestore();
    });

    it('un DESAFILIADO no puede volver a solicitar su baja', async () => {
      const { token } = await createTestUser(prisma, jwt, {
        estado_reg: 'DESAFILIADO',
      });

      const res = await request(app.getHttpServer())
        .post('/api/afiliaciones/baja')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('Login de un DESAFILIADO', () => {
    it('puede iniciar sesión y el token incluye estado_reg', async () => {
      const { user } = await createTestUser(prisma, jwt, {
        estado_reg: 'DESAFILIADO',
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ dni: user.dni, password: 'Password123!' });

      expect(res.status).toBe(200);
      const payload = jwt.verify(res.body.access_token);
      expect(payload.estado_reg).toBe('DESAFILIADO');
    });
  });

  describe('Restricciones de un DESAFILIADO', () => {
    it('no puede inscribirse a un evento', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { token } = await createTestUser(prisma, jwt, {
        estado_reg: 'DESAFILIADO',
      });

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

      const res = await request(app.getHttpServer())
        .post(`/api/eventos/${eventoRes.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('no puede generar checkout de cuota federativa', async () => {
      await prisma.cuotaGlobal.create({
        data: {
          monto_actual: 15000,
          fecha_vencimiento: new Date(Date.now() + 86400000),
        },
      });
      const { token } = await createTestUser(prisma, jwt, {
        estado_reg: 'DESAFILIADO',
      });

      const res = await request(app.getHttpServer())
        .post('/api/pagos/checkout-fee')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Baja por asociación', () => {
    it('queda PENDIENTE; la federación la aprueba → socio DESAFILIADO y se notifica al socio', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Asoc A' },
      });
      const { user } = await createTestUser(prisma, jwt, {
        asociacion_id: assoc.id,
      });
      const adminAssoc = await createTestUser(prisma, jwt, {
        asociacion_id: assoc.id,
        rol: 'ADMIN_ASOCIACION',
      });
      const adminGen = await createAdminGeneral(prisma, jwt);

      const bajaRes = await request(app.getHttpServer())
        .post(`/api/afiliaciones/baja/${user.id}`)
        .set('Authorization', `Bearer ${adminAssoc.token}`)
        .send({});

      expect(bajaRes.status).toBe(201);
      expect(bajaRes.body.estado).toBe('PENDIENTE');
      expect(bajaRes.body.tipo).toBe('BAJA_ASOCIACION');

      const spy = jest
        .spyOn(notificaciones, 'sendBajaConfirmadaSocio')
        .mockResolvedValue();

      const res = await request(app.getHttpServer())
        .patch(`/api/afiliaciones/baja/${bajaRes.body.id}/aprobar`)
        .set('Authorization', `Bearer ${adminGen.token}`);

      expect(res.status).toBe(200);
      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.estado_reg).toBe('DESAFILIADO');
      expect(updated?.rol).toBe('BASICO');
      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });

    it('la federación la rechaza → socio sigue APROBADO y solicitud RECHAZADO', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Asoc A' },
      });
      const { user } = await createTestUser(prisma, jwt, {
        asociacion_id: assoc.id,
      });
      const adminAssoc = await createTestUser(prisma, jwt, {
        asociacion_id: assoc.id,
        rol: 'ADMIN_ASOCIACION',
      });
      const adminGen = await createAdminGeneral(prisma, jwt);

      const bajaRes = await request(app.getHttpServer())
        .post(`/api/afiliaciones/baja/${user.id}`)
        .set('Authorization', `Bearer ${adminAssoc.token}`)
        .send({});

      const res = await request(app.getHttpServer())
        .patch(`/api/afiliaciones/baja/${bajaRes.body.id}/rechazar`)
        .set('Authorization', `Bearer ${adminGen.token}`)
        .send({ motivo: 'Sin justificación' });

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('RECHAZADO');
      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.estado_reg).toBe('APROBADO');
    });

    it('admin de otra asociación no puede solicitar la baja de un socio ajeno', async () => {
      const assocA = await prisma.asociacion.create({
        data: { nombre: 'Asoc A' },
      });
      const assocB = await prisma.asociacion.create({
        data: { nombre: 'Asoc B' },
      });
      const { user } = await createTestUser(prisma, jwt, {
        asociacion_id: assocA.id,
      });
      const adminB = await createTestUser(prisma, jwt, {
        asociacion_id: assocB.id,
        rol: 'ADMIN_ASOCIACION',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/afiliaciones/baja/${user.id}`)
        .set('Authorization', `Bearer ${adminB.token}`)
        .send({});

      expect(res.status).toBe(403);
    });
  });

  describe('Alta solicitada por un DESAFILIADO', () => {
    it('queda PENDIENTE; la asociación aprueba → APROBADO con nueva asoc/dojo y se informa a la federación', async () => {
      await prisma.configSistema.create({
        data: { fak_email: 'presidente@kendoargentina.org' },
      });

      const nuevaAssoc = await prisma.asociacion.create({
        data: { nombre: 'Nueva Asoc' },
      });
      const nuevoDojo = await prisma.dojo.create({
        data: { nombre: 'Nuevo Dojo', asociacion_id: nuevaAssoc.id },
      });
      const { user, token } = await createTestUser(prisma, jwt, {
        estado_reg: 'DESAFILIADO',
      });
      const adminNueva = await createTestUser(prisma, jwt, {
        asociacion_id: nuevaAssoc.id,
        rol: 'ADMIN_ASOCIACION',
      });

      const altaRes = await request(app.getHttpServer())
        .post('/api/afiliaciones/alta')
        .set('Authorization', `Bearer ${token}`)
        .send({ asociacion_id: nuevaAssoc.id, dojo_id: nuevoDojo.id });

      expect(altaRes.status).toBe(201);
      expect(altaRes.body.estado).toBe('PENDIENTE');

      const spy = jest
        .spyOn(notificaciones, 'sendAltaInformadaFederacion')
        .mockResolvedValue();

      const res = await request(app.getHttpServer())
        .patch(`/api/afiliaciones/alta/${altaRes.body.id}/aprobar`)
        .set('Authorization', `Bearer ${adminNueva.token}`);

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('APROBADO');
      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.estado_reg).toBe('APROBADO');
      expect(updated?.asociacion_id).toBe(nuevaAssoc.id);
      expect(updated?.dojo_id).toBe(nuevoDojo.id);
      expect(spy).toHaveBeenCalledWith(
        'presidente@kendoargentina.org',
        expect.any(String),
        'Nueva Asoc',
      );

      spy.mockRestore();
    });

    it('la asociación la rechaza → el usuario sigue DESAFILIADO', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Asoc Destino' },
      });
      const dojo = await prisma.dojo.create({
        data: { nombre: 'Dojo Destino', asociacion_id: assoc.id },
      });
      const { user } = await createTestUser(prisma, jwt, {
        estado_reg: 'DESAFILIADO',
      });
      const admin = await createTestUser(prisma, jwt, {
        asociacion_id: assoc.id,
        rol: 'ADMIN_ASOCIACION',
      });

      const solicitud = await prisma.solicitudAfiliacion.create({
        data: {
          tipo: 'ALTA_SOCIO',
          usuario_id: user.id,
          estado: 'PENDIENTE',
          asociacion_id: assoc.id,
          dojo_id: dojo.id,
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/afiliaciones/alta/${solicitud.id}/rechazar`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ motivo: 'No corresponde' });

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('RECHAZADO');
      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.estado_reg).toBe('DESAFILIADO');
    });

    it('un usuario APROBADO no puede solicitar un alta', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Asoc' },
      });
      const dojo = await prisma.dojo.create({
        data: { nombre: 'Dojo', asociacion_id: assoc.id },
      });
      const { token } = await createTestUser(prisma, jwt);

      const res = await request(app.getHttpServer())
        .post('/api/afiliaciones/alta')
        .set('Authorization', `Bearer ${token}`)
        .send({ asociacion_id: assoc.id, dojo_id: dojo.id });

      expect(res.status).toBe(400);
    });

    it('rechaza alta con dojo de otra asociación', async () => {
      const assocDest = await prisma.asociacion.create({
        data: { nombre: 'Destino' },
      });
      const assocOtra = await prisma.asociacion.create({
        data: { nombre: 'Otra' },
      });
      const dojoOtra = await prisma.dojo.create({
        data: { nombre: 'Dojo Otra', asociacion_id: assocOtra.id },
      });
      const { token } = await createTestUser(prisma, jwt, {
        estado_reg: 'DESAFILIADO',
      });

      const res = await request(app.getHttpServer())
        .post('/api/afiliaciones/alta')
        .set('Authorization', `Bearer ${token}`)
        .send({ asociacion_id: assocDest.id, dojo_id: dojoOtra.id });

      expect(res.status).toBe(400);
    });
  });

  describe('Alta directa por asociación', () => {
    it('admitir a un desafiliado es inmediato y lo pasa a la asociación del admin', async () => {
      const assocA = await prisma.asociacion.create({
        data: { nombre: 'Asoc A' },
      });
      const assocB = await prisma.asociacion.create({
        data: { nombre: 'Asoc B' },
      });
      const dojoB = await prisma.dojo.create({
        data: { nombre: 'Dojo B', asociacion_id: assocB.id },
      });
      const { user } = await createTestUser(prisma, jwt, {
        asociacion_id: assocA.id,
        estado_reg: 'DESAFILIADO',
      });
      const adminB = await createTestUser(prisma, jwt, {
        asociacion_id: assocB.id,
        rol: 'ADMIN_ASOCIACION',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/afiliaciones/alta/${user.id}`)
        .set('Authorization', `Bearer ${adminB.token}`)
        .send({ dojo_id: dojoB.id });

      expect(res.status).toBe(201);
      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.estado_reg).toBe('APROBADO');
      expect(updated?.asociacion_id).toBe(assocB.id);
      expect(updated?.dojo_id).toBe(dojoB.id);
    });

    it('rechaza admitir con un dojo de otra asociación', async () => {
      const assocA = await prisma.asociacion.create({
        data: { nombre: 'Asoc A' },
      });
      const assocB = await prisma.asociacion.create({
        data: { nombre: 'Asoc B' },
      });
      const dojoA = await prisma.dojo.create({
        data: { nombre: 'Dojo A', asociacion_id: assocA.id },
      });
      const { user } = await createTestUser(prisma, jwt, {
        asociacion_id: assocA.id,
        estado_reg: 'DESAFILIADO',
      });
      const adminB = await createTestUser(prisma, jwt, {
        asociacion_id: assocB.id,
        rol: 'ADMIN_ASOCIACION',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/afiliaciones/alta/${user.id}`)
        .set('Authorization', `Bearer ${adminB.token}`)
        .send({ dojo_id: dojoA.id });

      expect(res.status).toBe(400);
    });
  });

  describe('Mis solicitudes', () => {
    it('devuelve el historial de solicitudes del usuario', async () => {
      const { user, token } = await createTestUser(prisma, jwt);
      await prisma.solicitudAfiliacion.create({
        data: { tipo: 'BAJA_SOCIO', usuario_id: user.id, estado: 'APROBADO' },
      });

      const res = await request(app.getHttpServer())
        .get('/api/afiliaciones/mis-solicitudes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].tipo).toBe('BAJA_SOCIO');
    });
  });
});
