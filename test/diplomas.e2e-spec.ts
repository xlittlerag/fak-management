import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MercadoPagoService } from '../src/pagos/mercado-pago.service';
import {
  createTestApp,
  cleanupDb,
  createTestUser,
  createAdminGeneral,
} from './test-utils';

describe('Diplomas (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const seedEvidenciaExamen = async (
    inscripcionId: number,
    disciplina: string,
    instancias: string[],
    pagado = true,
  ) => {
    await prisma.resultadoExamen.createMany({
      data: instancias.map((instancia) => ({
        inscripcion_id: inscripcionId,
        disciplina,
        instancia: instancia as 'PRACTICO' | 'KATA' | 'ESCRITO',
        aprobado: true,
      })),
    });
    await prisma.registroExamen.create({
      data: { inscripcion_id: inscripcionId, disciplina, pagado },
    });
  };

  beforeAll(async () => {
    ({ app, prisma, jwt } = await createTestApp());
    const mpService = app.get(MercadoPagoService);
    jest.spyOn(mpService, 'createReimpresionPreference').mockResolvedValue({
      preferenceId: 'mp_reimp_test',
      initPoint: 'https://test.mp.com/reimp',
      externalReference: 'reimp_test_ref',
    });
    jest.spyOn(mpService, 'createInscriptionPreference').mockResolvedValue({
      preferenceId: 'mp_test',
      initPoint: 'https://test.mp.com',
      externalReference: 'test_ref',
    });
    jest.spyOn(mpService, 'createFederativeFeePreference').mockResolvedValue({
      preferenceId: 'mp_fee_test',
      initPoint: 'https://test.mp.com/fee',
      externalReference: 'fee_test_ref',
      paymentMethods: { excludedPaymentTypes: [{ id: 'credit_card' }] },
    });
  });

  beforeEach(async () => {
    await cleanupDb(prisma);
  });

  afterAll(async () => {
    await cleanupDb(prisma);
    await app.close();
  });

  describe('POST /admin/diplomas', () => {
    it('debería crear un diploma nacional individual', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      const res = await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .attach('file', Buffer.from('test-content'), 'diploma.pdf')
        .field('usuario_id', String(user.user.id))
        .field('disciplina', 'KENDO')
        .field('graduacion', 'DAN_1');

      expect(res.status).toBe(201);
      expect(res.body.disciplina).toBe('KENDO');
      expect(res.body.graduacion).toBe('DAN_1');
    });

    it('debería rechazar si no es ADMIN_GENERAL', async () => {
      const user = await createTestUser(prisma, jwt);
      const res = await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${user.token}`)
        .attach('file', Buffer.from('test'), 'd.pdf')
        .field('usuario_id', String(user.user.id))
        .field('disciplina', 'KENDO')
        .field('graduacion', 'DAN_1');
      expect(res.status).toBe(403);
    });

    it('debería vincular a inscripción aprobada y detectar duplicado', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      const eventoRes = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
          fecha_fin: new Date(Date.now() + 2 * 86400000).toISOString(),
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          ambito: 'NACIONAL',
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: [
            { disciplina: 'KENDO', grad_min: 'KYU_3', grad_max: 'DAN_8' },
          ],
        });

      const inscRes = await request(app.getHttpServer())
        .post(`/api/eventos/${eventoRes.body.id}/inscribir`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ disciplinas: ['KENDO'] });

      await prisma.inscripcionEvento.update({
        where: { id: inscRes.body.id },
        data: {
          estado_aprob: 'APROBADO',
          pagado: true,
          categoria_grad: { KENDO: 'DAN_1' },
        },
      });

      await seedEvidenciaExamen(inscRes.body.id, 'KENDO', [
        'PRACTICO',
        'KATA',
        'ESCRITO',
      ]);

      const res1 = await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .attach('file', Buffer.from('test'), 'd1.pdf')
        .field('usuario_id', String(user.user.id))
        .field('disciplina', 'KENDO')
        .field('inscripcion_id', String(inscRes.body.id));

      expect(res1.status).toBe(201);
      expect(res1.body.graduacion).toBe('DAN_1');

      const res2 = await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .attach('file', Buffer.from('test'), 'd2.pdf')
        .field('usuario_id', String(user.user.id))
        .field('disciplina', 'KENDO')
        .field('inscripcion_id', String(inscRes.body.id));

      expect(res2.status).toBe(409);
    });
  });

  describe('POST /admin/diplomas/lote', () => {
    it('debería cargar diplomas por lote desde un evento', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user1 = await createTestUser(prisma, jwt);
      const user2 = await createTestUser(prisma, jwt);

      const eventoRes = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
          fecha_fin: new Date(Date.now() + 2 * 86400000).toISOString(),
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          ambito: 'NACIONAL',
          disciplinas: ['KENDO', 'IAIDO'],
          graduaciones_a_rendir: [
            { disciplina: 'KENDO', grad_min: 'KYU_3', grad_max: 'DAN_8' },
            { disciplina: 'IAIDO', grad_min: 'KYU_3', grad_max: 'DAN_8' },
          ],
        });

      for (const u of [user1, user2]) {
        const inscRes = await request(app.getHttpServer())
          .post(`/api/eventos/${eventoRes.body.id}/inscribir`)
          .set('Authorization', `Bearer ${u.token}`)
          .send({ disciplinas: ['KENDO'] });

        await prisma.inscripcionEvento.update({
          where: { id: inscRes.body.id },
          data: {
            estado_aprob: 'APROBADO',
            pagado: true,
            categoria_grad: { KENDO: 'DAN_1' },
          },
        });

        await seedEvidenciaExamen(inscRes.body.id, 'KENDO', [
          'PRACTICO',
          'KATA',
          'ESCRITO',
        ]);
      }

      const res = await request(app.getHttpServer())
        .post('/api/admin/diplomas/lote')
        .set('Authorization', `Bearer ${admin.token}`)
        .attach('files', Buffer.from('test'), 'u1.pdf')
        .attach('files', Buffer.from('test'), 'u2.pdf')
        .field('evento_id', String(eventoRes.body.id))
        .field(
          'archivos_meta',
          JSON.stringify([
            { usuario_id: user1.user.id, disciplina: 'KENDO' },
            { usuario_id: user2.user.id, disciplina: 'KENDO' },
          ]),
        );

      expect(res.status).toBe(201);
      expect(res.body.created).toBe(2);
    });

    it('debería rechazar si el evento no tiene inscripciones aprobadas', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      const eventoRes = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
          fecha_fin: new Date(Date.now() + 2 * 86400000).toISOString(),
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          ambito: 'NACIONAL',
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: [
            { disciplina: 'KENDO', grad_min: 'KYU_3', grad_max: 'DAN_8' },
          ],
        });

      const res = await request(app.getHttpServer())
        .post('/api/admin/diplomas/lote')
        .set('Authorization', `Bearer ${admin.token}`)
        .attach('files', Buffer.from('test'), 'u.pdf')
        .field('evento_id', String(eventoRes.body.id))
        .field(
          'archivos_meta',
          JSON.stringify([{ usuario_id: user.user.id, disciplina: 'KENDO' }]),
        );

      expect(res.status).toBe(201);
      expect(res.body.created).toBe(0);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Graduación por diploma', () => {
    const crearInscripcionExamen = async (
      adminToken: string,
      userToken: string,
      categoriaGrad: Record<string, string>,
    ) => {
      const eventoRes = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
          fecha_fin: new Date(Date.now() + 2 * 86400000).toISOString(),
          datos_lugar: { direccion: 'Test', provincia: 'CABA' },
          ambito: 'NACIONAL',
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: [
            { disciplina: 'KENDO', grad_min: 'KYU_3', grad_max: 'DAN_8' },
          ],
        });

      const inscRes = await request(app.getHttpServer())
        .post(`/api/eventos/${eventoRes.body.id}/inscribir`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ disciplinas: ['KENDO'] });

      const disciplina = Object.keys(categoriaGrad)[0];
      await prisma.inscripcionEvento.update({
        where: { id: inscRes.body.id },
        data: {
          estado_aprob: 'APROBADO',
          pagado: true,
          categoria_grad: categoriaGrad,
        },
      });
      return {
        eventoId: eventoRes.body.id,
        inscripcionId: inscRes.body.id,
        disciplina,
      };
    };

    const subirDiploma = (
      adminToken: string,
      usuarioId: number,
      inscripcionId: number,
      disciplina: string,
    ) =>
      request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('test'), 'd.pdf')
        .field('usuario_id', String(usuarioId))
        .field('disciplina', disciplina)
        .field('inscripcion_id', String(inscripcionId));

    it('aplica la graduación al cargar el diploma con evidencia completa', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt, {
        grad_kendo: 'SIN_GRADUACION',
      });
      const { inscripcionId, disciplina } = await crearInscripcionExamen(
        admin.token,
        user.token,
        { KENDO: 'KYU_3' },
      );
      await seedEvidenciaExamen(inscripcionId, disciplina, ['PRACTICO']);

      const res = await subirDiploma(
        admin.token,
        user.user.id,
        inscripcionId,
        disciplina,
      );
      expect(res.status).toBe(201);
      expect(res.body.graduacion).toBe('KYU_3');

      const updated = await prisma.usuario.findUnique({
        where: { id: user.user.id },
      });
      expect(updated?.grad_kendo).toBe('KYU_3');
      expect(updated?.f_grad_kendo).not.toBeNull();

      const historial = await prisma.historialGraduacion.findMany({
        where: { usuario_id: user.user.id },
      });
      expect(historial).toHaveLength(1);
      expect(historial[0]).toMatchObject({
        disciplina: 'KENDO',
        graduacion: 'KYU_3',
      });
      expect(historial[0].otorgado_por).toContain('Diploma nacional');

      const registro = await prisma.registroExamen.findUnique({
        where: {
          inscripcion_id_disciplina: {
            inscripcion_id: inscripcionId,
            disciplina,
          },
        },
      });
      expect(registro?.graduacion_aplicada).toBe(true);
    });

    it('rechaza el diploma sin la evidencia completa en un examen', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt, {
        grad_kendo: 'SIN_GRADUACION',
      });
      const { inscripcionId, disciplina } = await crearInscripcionExamen(
        admin.token,
        user.token,
        { KENDO: 'DAN_1' },
      );
      await seedEvidenciaExamen(inscripcionId, disciplina, ['PRACTICO']);

      const res = await subirDiploma(
        admin.token,
        user.user.id,
        inscripcionId,
        disciplina,
      );
      expect(res.status).toBe(400);

      const updated = await prisma.usuario.findUnique({
        where: { id: user.user.id },
      });
      expect(updated?.grad_kendo).toBe('SIN_GRADUACION');
    });

    it('rechaza el diploma si no se registró el pago del examen', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt, {
        grad_kendo: 'SIN_GRADUACION',
      });
      const { inscripcionId, disciplina } = await crearInscripcionExamen(
        admin.token,
        user.token,
        { KENDO: 'KYU_3' },
      );
      await seedEvidenciaExamen(inscripcionId, disciplina, ['PRACTICO'], false);

      const res = await subirDiploma(
        admin.token,
        user.user.id,
        inscripcionId,
        disciplina,
      );
      expect(res.status).toBe(400);
    });

    it('el diploma sin inscripción no aplica graduación', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt, {
        grad_kendo: 'SIN_GRADUACION',
      });

      const res = await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .attach('file', Buffer.from('test'), 'd.pdf')
        .field('usuario_id', String(user.user.id))
        .field('disciplina', 'KENDO')
        .field('graduacion', 'DAN_1');
      expect(res.status).toBe(201);

      const updated = await prisma.usuario.findUnique({
        where: { id: user.user.id },
      });
      expect(updated?.grad_kendo).toBe('SIN_GRADUACION');

      const historial = await prisma.historialGraduacion.findMany({
        where: { usuario_id: user.user.id },
      });
      expect(historial).toHaveLength(0);
    });
  });

  describe('GET /admin/diplomas', () => {
    it('debería listar diplomas', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .attach('file', Buffer.from('test'), 'd.pdf')
        .field('usuario_id', String(user.user.id))
        .field('disciplina', 'KENDO')
        .field('graduacion', 'DAN_1');

      await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .attach('file', Buffer.from('test'), 'd2.pdf')
        .field('usuario_id', String(user.user.id))
        .field('disciplina', 'IAIDO')
        .field('graduacion', 'DAN_2');

      const res = await request(app.getHttpServer())
        .get('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });
  });

  describe('GET /mis-diplomas', () => {
    it('debería listar diplomas del usuario autenticado', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .attach('file', Buffer.from('test'), 'd.pdf')
        .field('usuario_id', String(user.user.id))
        .field('disciplina', 'KENDO')
        .field('graduacion', 'DAN_1');

      const res = await request(app.getHttpServer())
        .get('/api/mis-diplomas')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].disciplina).toBe('KENDO');
    });
  });

  describe('Config endpoints', () => {
    it('GET /admin/diploma/config debería devolver precio', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const res = await request(app.getHttpServer())
        .get('/api/admin/diploma/config')
        .set('Authorization', `Bearer ${admin.token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('precio_reimpresion');
    });

    it('PATCH /admin/diploma/config debería actualizar precio', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const res = await request(app.getHttpServer())
        .patch('/api/admin/diploma/config')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ precio_reimpresion: 10000 });
      expect(res.status).toBe(200);
      expect(res.body.precio_reimpresion).toBe(10000);
    });
  });

  describe('POST /diplomas/reimprimir', () => {
    it('debería crear una solicitud de reimpresión', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .attach('file', Buffer.from('test'), 'd.pdf')
        .field('usuario_id', String(user.user.id))
        .field('disciplina', 'KENDO')
        .field('graduacion', 'DAN_1');

      const res = await request(app.getHttpServer())
        .post('/api/diplomas/reimprimir')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ disciplina: 'KENDO' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('reimpresion_id');
      expect(res.body).toHaveProperty('preference');
    });

    it('debería rechazar si no tiene diploma de esa disciplina', async () => {
      const user = await createTestUser(prisma, jwt);
      const res = await request(app.getHttpServer())
        .post('/api/diplomas/reimprimir')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ disciplina: 'KENDO' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /admin/diploma/reimpresiones', () => {
    it('debería listar solicitudes de reimpresión', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const user = await createTestUser(prisma, jwt);

      await request(app.getHttpServer())
        .post('/api/admin/diplomas')
        .set('Authorization', `Bearer ${admin.token}`)
        .attach('file', Buffer.from('test'), 'd.pdf')
        .field('usuario_id', String(user.user.id))
        .field('disciplina', 'KENDO')
        .field('graduacion', 'DAN_1');

      await request(app.getHttpServer())
        .post('/api/diplomas/reimprimir')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ disciplina: 'KENDO' });

      const res = await request(app.getHttpServer())
        .get('/api/admin/diploma/reimpresiones')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].usuario.id).toBe(user.user.id);
    });
  });
});
