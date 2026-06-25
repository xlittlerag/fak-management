import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MercadoPagoService } from '../src/pagos/mercado-pago.service';
import { createTestApp, cleanupDb, createTestUser, createAdminGeneral } from './test-utils';

describe('Eventos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let mpService: MercadoPagoService;

  beforeAll(async () => {
    ({ app, prisma, jwt } = await createTestApp());
    mpService = app.get(MercadoPagoService);
    jest.spyOn(mpService, 'createInscriptionPreference').mockImplementation(
      async (userId: number, userEmail: string, amount: number, inscripcionId: number, eventoId: number) => ({
        preferenceId: `mp_insc_${inscripcionId}_${Date.now()}`,
        initPoint: `https://mercadopago.com/checkout/v1/preferences/mp_insc_${inscripcionId}`,
        externalReference: `inscripcion_user_${userId}_evento_${eventoId}_insc_${inscripcionId}_ts_${Date.now()}`,
      })
    );
  });

  beforeEach(async () => {
    await cleanupDb(prisma);
  });

  afterAll(async () => {
    await cleanupDb(prisma);
    await app.close();
  });

  describe('POST /eventos — Crear evento', () => {
    it('debería crear un torneo con categorías', async () => {
      const admin = await createAdminGeneral(prisma, jwt);

      const response = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'TORNEO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Polideportivo Central', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 5000,
          categorias: [
            { nombre: 'Torneo Kyu', grad_min: 'KYU_3', grad_max: 'KYU_1' },
            { nombre: '1° y 2° Dan', grad_min: 'DAN_1', grad_max: 'DAN_2' },
            { nombre: 'Femenino', genero: 'FEMENINO' },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.tipo).toBe('TORNEO');
      expect(response.body.torneo.categorias).toHaveLength(3);
    });

    it('debería rechazar creación sin rol ADMIN_GENERAL', async () => {
      const { token } = await createTestUser(prisma, jwt);

      await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 0,
        })
        .expect(403);
    });
  });

  describe('GET /eventos — Listar eventos', () => {
    it('debería listar eventos públicos sin autenticación', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const created = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 0,
        });
      await request(app.getHttpServer())
        .patch(`/api/eventos/${created.body.id}/publicar`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/eventos')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /eventos/:id — Ver detalle', () => {
    it('debería retornar detalle de evento', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const created = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Dojo Central', provincia: 'CABA' },
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: ['KYU_1'],
        });

      const response = await request(app.getHttpServer())
        .get(`/api/eventos/${created.body.id}`)
        .expect(200);

      expect(response.body.tipo).toBe('EXAMEN');
      expect(response.body.examen.disciplinas).toEqual(['KENDO']);
    });

    it('debería retornar 404 si el evento no existe', async () => {
      await request(app.getHttpServer())
        .get('/api/eventos/99999')
        .expect(404);
    });
  });

  describe('PATCH /eventos/:id — Actualizar evento', () => {
    it('debería actualizar un evento', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const created = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 0,
        });

      const response = await request(app.getHttpServer())
        .patch(`/api/eventos/${created.body.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ tipo: 'TORNEO' })
        .expect(200);

      expect(response.body.tipo).toBe('TORNEO');
    });
  });

  describe('DELETE /eventos/:id — Eliminar evento', () => {
    it('debería eliminar un evento', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const created = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 0,
        });

      await request(app.getHttpServer())
        .delete(`/api/eventos/${created.body.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/eventos/${created.body.id}`)
        .expect(404);
    });
  });

  describe('POST /eventos/:id/inscribir — Inscripción', () => {
    it('debería inscribir a un usuario activo en un evento', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { user, token } = await createTestUser(prisma, jwt, { estado_pago: true });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 0,
        });

      const response = await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.estado_aprob).toBe('PENDIENTE');
    });

    it('debería rechazar inscripción si el usuario no tiene la cuota al día', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { token } = await createTestUser(prisma, jwt, { estado_pago: false });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 0,
        });

      await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('debería rechazar inscripción duplicada', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { token } = await createTestUser(prisma, jwt, { estado_pago: true });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 0,
        });

      await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
    });

    it('debería validar categoría al inscribir en torneo', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { token } = await createTestUser(prisma, jwt, { estado_pago: true, grad_kendo: 'KYU_1' });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'TORNEO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 5000,
          categorias: [
            { nombre: 'Torneo Kyu', grad_min: 'KYU_3', grad_max: 'KYU_1' },
            { nombre: '1° Dan', grad_min: 'DAN_1', grad_max: 'DAN_1' },
          ],
        });

      const response = await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .send({ categorias: ['Torneo Kyu'] })
        .expect(200);

      expect(response.body.categorias).toEqual(['Torneo Kyu']);
    });

    it('debería rechazar inscripción en categoría que no corresponde a la graduación', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { token } = await createTestUser(prisma, jwt, { estado_pago: true, grad_kendo: 'KYU_1' });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'TORNEO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 5000,
          categorias: [
            { nombre: '1° Dan', grad_min: 'DAN_1', grad_max: 'DAN_1' },
          ],
        });

      await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .send({ categorias: ['1° Dan'] })
        .expect(403);
    });
  });

  describe('Validación de requisitos de examen', () => {
    it('debería inscribir en KYU_3 sin requisito previo', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { token } = await createTestUser(prisma, jwt, { estado_pago: true, grad_kendo: 'SIN_GRADUACION' });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Dojo', provincia: 'CABA' },
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: ['KYU_3'],
        });

      const res = await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .send({ categorias: ['KYU_3'], disciplinas: ['KENDO'] })
        .expect(200);

      expect(res.body.disciplinas).toEqual(['KENDO']);
      expect(res.body.categorias).toEqual(['KYU_3']);
    });

    it('debería rechazar inscripción si el usuario no tiene la graduación previa requerida', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { token } = await createTestUser(prisma, jwt, { estado_pago: true, grad_kendo: 'SIN_GRADUACION' });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Dojo', provincia: 'CABA' },
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: ['KYU_2'],
        });

      await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .send({ categorias: ['KYU_2'], disciplinas: ['KENDO'] })
        .expect(403);
    });

    it('debería rechazar inscripción si no se alcanzó el tiempo de espera mínimo', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const fechaReciente = new Date();
      fechaReciente.setMonth(fechaReciente.getMonth() - 1); // hace 1 mes
      const { token } = await createTestUser(prisma, jwt, {
        estado_pago: true,
        grad_kendo: 'KYU_1',
        f_grad_kendo: fechaReciente,
      });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Dojo', provincia: 'CABA' },
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: ['DAN_1'],
        });

      // DAN_1 requires 6 months after KYU_1, user only has 1 month
      await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .send({ categorias: ['DAN_1'], disciplinas: ['KENDO'] })
        .expect(403);
    });

    it('debería rechazar inscripción si el usuario no cumple la edad mínima', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const fechaNac = new Date();
      fechaNac.setFullYear(fechaNac.getFullYear() - 12); // 12 años
      const { token } = await createTestUser(prisma, jwt, {
        estado_pago: true,
        grad_kendo: 'KYU_1',
        fecha_nacimiento: fechaNac,
        f_grad_kendo: new Date('2023-01-01'),
      });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Dojo', provincia: 'CABA' },
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: ['DAN_1'],
        });

      // DAN_1 requires at least 13 years old
      await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .send({ categorias: ['DAN_1'], disciplinas: ['KENDO'] })
        .expect(403);
    });

    it('debería rechazar inscripción en examen sin disciplinas en el body', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { token } = await createTestUser(prisma, jwt, { estado_pago: true, grad_kendo: 'SIN_GRADUACION' });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Dojo', provincia: 'CABA' },
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: ['KYU_3'],
        });

      await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .send({ categorias: ['KYU_3'] })
        .expect(400);
    });
  });

  describe('PATCH /inscripciones/:id/aprobar — Aprobar inscripción', () => {
    it('debería aprobar una inscripción como admin de asociación', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { user, token, asociacionId } = await createTestUser(prisma, jwt, { estado_pago: true });
      const adminAssoc = await createTestUser(prisma, jwt, {
        rol: 'ADMIN_ASOCIACION',
        asociacion_id: asociacionId,
        estado_pago: true,
      });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 0,
        });

      const inscripcion = await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .patch(`/api/inscripciones/${inscripcion.body.id}/aprobar`)
        .set('Authorization', `Bearer ${adminAssoc.token}`)
        .send({ accion: 'APROBAR' })
        .expect(200);

      expect(response.body.estado_aprob).toBe('APROBADO');
    });

    it('debería rechazar aprobación de inscripción de otra asociación', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { token } = await createTestUser(prisma, jwt, { estado_pago: true });
      const otherAssoc = await createTestUser(prisma, jwt, {
        rol: 'ADMIN_ASOCIACION',
        estado_pago: true,
      });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 0,
        });

      const inscripcion = await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/inscripciones/${inscripcion.body.id}/aprobar`)
        .set('Authorization', `Bearer ${otherAssoc.token}`)
        .send({ accion: 'APROBAR' })
        .expect(403);
    });
  });

  describe('POST /inscripciones/:id/pagar — Pago de inscripción', () => {
    it('debería generar preferencia de pago para inscripción aprobada', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { user, token, asociacionId } = await createTestUser(prisma, jwt, { estado_pago: true });
      const adminAssoc = await createTestUser(prisma, jwt, {
        rol: 'ADMIN_ASOCIACION',
        asociacion_id: asociacionId,
        estado_pago: true,
      });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 5000,
        });

      const inscripcion = await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/inscripciones/${inscripcion.body.id}/aprobar`)
        .set('Authorization', `Bearer ${adminAssoc.token}`)
        .send({ accion: 'APROBAR' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post(`/api/inscripciones/${inscripcion.body.id}/pagar`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('preferenceId');
      expect(response.body).toHaveProperty('initPoint');
    });

    it('debería rechazar pago si la inscripción no está aprobada', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { token } = await createTestUser(prisma, jwt, { estado_pago: true });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 5000,
        });

      const inscripcion = await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/inscripciones/${inscripcion.body.id}/pagar`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /mis-inscripciones — Mis inscripciones', () => {
    it('debería listar inscripciones del usuario autenticado', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { token } = await createTestUser(prisma, jwt, { estado_pago: true });

      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 0,
        });

      await request(app.getHttpServer())
        .post(`/api/eventos/${evento.body.id}/inscribir`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/mis-inscripciones')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });
  });

  describe('Validación tipo-dependiente', () => {
    it('debería crear un examen con config válida', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const res = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Dojo Central', provincia: 'CABA' },
          disciplinas: ['KENDO', 'IAIDO'],
          graduaciones_a_rendir: ['KYU_1', 'DAN_1'],
        })
        .expect(201);
      expect(res.body.examen.disciplinas).toEqual(['KENDO', 'IAIDO']);
      expect(res.body.examen.graduaciones_a_rendir).toEqual(['KYU_1', 'DAN_1']);
    });

    it('debería rechazar examen sin disciplinas', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Dojo', provincia: 'CABA' },
          graduaciones_a_rendir: ['KYU_1'],
        })
        .expect(400);
    });

    it('debería rechazar examen con costo_inscripcion (debe usar tabla de precios)', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Dojo', provincia: 'CABA' },
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: ['KYU_1'],
          costo_inscripcion: 5000,
        })
        .expect(400);
    });

    it('debería rechazar seminario con categorías', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 0,
          categorias: [{ nombre: 'Test' }],
        })
        .expect(400);
    });

    it('debería rechazar inscripción múltiple en examen', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: '2026-12-01T09:00:00Z',
          fecha_fin: '2026-12-01T18:00:00Z',
          datos_lugar: { direccion: 'Dojo', provincia: 'CABA' },
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: ['KYU_1'],
          inscripcion_multiple: true,
        })
        .expect(400);
    });
  });

  describe('Seguridad y Acceso', () => {
    it('debería rechazar inscripción sin autenticación', async () => {
      await request(app.getHttpServer())
        .post('/api/eventos/1/inscribir')
        .expect(401);
    });

    it('debería listar eventos sin autenticación (público)', async () => {
      await request(app.getHttpServer())
        .get('/api/eventos')
        .expect(200);
    });
  });
});
