import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  createTestApp,
  cleanupDb,
  createTestUser,
  createAdminGeneral,
} from './test-utils';

describe('Mesas examinadoras (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const fechaHaceMeses = (meses: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - meses);
    return d;
  };

  const crearExamen = (adminToken: string, disciplinas: string[]) =>
    request(app.getHttpServer())
      .post('/api/eventos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipo: 'EXAMEN',
        fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
        fecha_fin: new Date(Date.now() + 86400000 + 9 * 3600000).toISOString(),
        datos_lugar: { direccion: 'Dojo', provincia: 'CABA' },
        disciplinas,
        graduaciones_a_rendir: disciplinas.map((d) => ({
          disciplina: d,
          grad_min: 'KYU_3',
          grad_max: 'DAN_8',
        })),
      })
      .expect(201);

  const crearCandidato = async (grad: Record<string, string>) => {
    const overrides: Record<string, unknown> = { estado_pago: true };
    for (const [key, value] of Object.entries(grad)) {
      overrides[key] = value;
      if (value !== 'SIN_GRADUACION') {
        overrides[`f_${key}`] = fechaHaceMeses(8);
      }
    }
    return createTestUser(prisma, jwt, overrides);
  };

  const inscribir = (
    userToken: string,
    eventoId: number,
    disciplinas: string[],
  ) =>
    request(app.getHttpServer())
      .post(`/api/eventos/${eventoId}/inscribir`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ disciplinas })
      .expect(200);

  const aprobarInscripcion = (adminToken: string, inscripcionId: number) =>
    request(app.getHttpServer())
      .patch(`/api/inscripciones/${inscripcionId}/aprobar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ accion: 'APROBAR' })
      .expect(200);

  const crearMesa = (
    adminToken: string,
    eventoId: number,
    body: Record<string, unknown>,
  ) =>
    request(app.getHttpServer())
      .post(`/api/admin/eventos/${eventoId}/mesas`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

  const cargarResultado = (adminToken: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/admin/resultados')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

  const registrarPago = (
    adminToken: string,
    inscripcionId: number,
    disciplina: string,
  ) =>
    request(app.getHttpServer())
      .post(`/api/admin/inscripciones/${inscripcionId}/registro-pagado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ disciplina });

  const getResultados = (adminToken: string, eventoId: number) =>
    request(app.getHttpServer())
      .get(`/api/admin/examenes/${eventoId}/resultados`)
      .set('Authorization', `Bearer ${adminToken}`);

  const setupCandidato = async (
    adminToken: string,
    grad: Record<string, string>,
    disciplinas: string[],
  ) => {
    const { token, user } = await crearCandidato(grad);
    const evento = await crearExamen(adminToken, disciplinas);
    const insc = await inscribir(token, evento.body.id, disciplinas);
    await aprobarInscripcion(adminToken, insc.body.id);
    return { user, evento: evento.body, insc: insc.body };
  };

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

  describe('CRUD de mesas', () => {
    it('crea una mesa válida en un examen', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const evento = await crearExamen(admin.token, ['KENDO']);

      const res = await crearMesa(admin.token, evento.body.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez', 'Ana López'],
        grad_min: 'KYU_2',
        grad_max: 'KYU_1',
      }).expect(201);

      expect(res.body).toMatchObject({
        evento_id: evento.body.id,
        disciplina: 'KENDO',
        grad_min: 'KYU_2',
        grad_max: 'KYU_1',
      });
      expect(res.body.examinadores).toEqual(['Juan Pérez', 'Ana López']);
      expect(res.body.id).toBeDefined();
    });

    it('rechaza crear una mesa en un evento que no es EXAMEN', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'SEMINARIO',
          fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
          fecha_fin: new Date(
            Date.now() + 86400000 + 9 * 3600000,
          ).toISOString(),
          datos_lugar: { direccion: 'Dojo', provincia: 'CABA' },
          disciplina: 'KENDO',
          costo_inscripcion: 0,
        })
        .expect(201);

      await crearMesa(admin.token, evento.body.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_2',
        grad_max: 'KYU_1',
      }).expect(400);
    });

    it('rechaza crear una mesa con grad_min mayor que grad_max', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const evento = await crearExamen(admin.token, ['KENDO']);

      await crearMesa(admin.token, evento.body.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'DAN_1',
        grad_max: 'KYU_1',
      }).expect(400);
    });

    it('rechaza crear una mesa con rango fuera de las graduaciones a rendir', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const evento = await request(app.getHttpServer())
        .post('/api/eventos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          tipo: 'EXAMEN',
          fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
          fecha_fin: new Date(
            Date.now() + 86400000 + 9 * 3600000,
          ).toISOString(),
          datos_lugar: { direccion: 'Dojo', provincia: 'CABA' },
          disciplinas: ['KENDO'],
          graduaciones_a_rendir: [
            { disciplina: 'KENDO', grad_min: 'KYU_3', grad_max: 'KYU_1' },
          ],
        })
        .expect(201);

      await crearMesa(admin.token, evento.body.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_2',
      }).expect(400);
    });

    it('rechaza crear una mesa con disciplina no disponible en el examen', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const evento = await crearExamen(admin.token, ['KENDO']);

      await crearMesa(admin.token, evento.body.id, {
        disciplina: 'IAIDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_1',
      }).expect(400);
    });

    it('rechaza crear una mesa con una graduación inválida', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const evento = await crearExamen(admin.token, ['KENDO']);

      await crearMesa(admin.token, evento.body.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'SHODAN',
        grad_max: 'KYU_1',
      }).expect(400);
    });

    it('rechaza que un ADMIN_ASOCIACION cree una mesa', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { token: assocToken } = await createTestUser(prisma, jwt, {
        rol: 'ADMIN_ASOCIACION',
        estado_pago: true,
      });
      const evento = await crearExamen(admin.token, ['KENDO']);

      await crearMesa(assocToken, evento.body.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(403);
    });

    it('lista las mesas de un examen', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const evento = await crearExamen(admin.token, ['KENDO']);
      await crearMesa(admin.token, evento.body.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/admin/eventos/${evento.body.id}/mesas`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        evento_id: evento.body.id,
        disciplina: 'KENDO',
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      });
    });

    it('actualiza una mesa existente', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const evento = await crearExamen(admin.token, ['KENDO']);
      const mesa = await crearMesa(admin.token, evento.body.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/admin/mesas/${mesa.body.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          examinadores: ['María García'],
          grad_min: 'KYU_2',
          grad_max: 'KYU_1',
        })
        .expect(200);

      expect(res.body.examinadores).toEqual(['María García']);
      expect(res.body.grad_min).toBe('KYU_2');
      expect(res.body.grad_max).toBe('KYU_1');
    });

    it('elimina una mesa sin resultados cargados', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const evento = await crearExamen(admin.token, ['KENDO']);
      const mesa = await crearMesa(admin.token, evento.body.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      await request(app.getHttpServer())
        .delete(`/api/admin/mesas/${mesa.body.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      const existe = await prisma.mesaExaminadora.findUnique({
        where: { id: mesa.body.id },
      });
      expect(existe).toBeNull();
    });

    it('rechaza eliminar una mesa con resultados cargados', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      const mesa = await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);

      await request(app.getHttpServer())
        .delete(`/api/admin/mesas/${mesa.body.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(409);
    });
  });

  describe('Asignación de mesa al cargar resultado', () => {
    it('rechaza cargar un resultado sin mesas compatibles', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(400);
    });

    it('asigna automáticamente la única mesa compatible', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      const mesa = await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      const res = await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);

      expect(res.body.mesa_id).toBe(mesa.body.id);

      const resultado = await prisma.resultadoExamen.findUnique({
        where: {
          inscripcion_id_disciplina_instancia: {
            inscripcion_id: insc.id,
            disciplina: 'KENDO',
            instancia: 'PRACTICO',
          },
        },
      });
      expect(resultado?.mesa_id).toBe(mesa.body.id);
    });

    it('rechaza cargar sin mesa_id cuando hay varias mesas compatibles', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Ana López'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(400);
    });

    it('usa la mesa indicada cuando hay varias compatibles', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);
      const mesaB = await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Ana López'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      const res = await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
        mesa_id: mesaB.body.id,
      }).expect(201);

      expect(res.body.mesa_id).toBe(mesaB.body.id);
    });

    it('rechaza asignar una mesa de otra disciplina', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION', grad_iaido: 'SIN_GRADUACION' },
        ['KENDO', 'IAIDO'],
      );
      const mesaIaido = await crearMesa(admin.token, evento.id, {
        disciplina: 'IAIDO',
        examinadores: ['María García'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_1',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
        mesa_id: mesaIaido.body.id,
      }).expect(400);
    });

    it('rechaza cargar un resultado para una inscripción no aprobada', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { token } = await crearCandidato({ grad_kendo: 'SIN_GRADUACION' });
      const evento = await crearExamen(admin.token, ['KENDO']);
      const insc = await inscribir(token, evento.body.id, ['KENDO']);
      await crearMesa(admin.token, evento.body.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.body.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(400);
    });

    it('actualiza un resultado ya cargado sin duplicar la fila', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: false,
      }).expect(201);

      const filas = await prisma.resultadoExamen.findMany({
        where: { inscripcion_id: insc.id },
      });
      expect(filas).toHaveLength(1);
      expect(filas[0].aprobado).toBe(false);
    });
  });

  describe('Instancias requeridas por disciplina y graduación', () => {
    it('KENDO target KYU_3 acepta solo PRACTICO', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'KATA',
        aprobado: true,
      }).expect(400);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'ESCRITO',
        aprobado: true,
      }).expect(400);
    });

    it('KENDO target KYU_1 acepta PRACTICO y KATA pero no ESCRITO', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'KYU_2' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'KATA',
        aprobado: true,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'ESCRITO',
        aprobado: true,
      }).expect(400);
    });

    it('KENDO target DAN_1 acepta PRACTICO, KATA y ESCRITO', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'KYU_1' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      for (const instancia of ['PRACTICO', 'KATA', 'ESCRITO']) {
        await cargarResultado(admin.token, {
          inscripcion_id: insc.id,
          disciplina: 'KENDO',
          instancia,
          aprobado: true,
        }).expect(201);
      }
    });

    it('IAIDO target KYU_2 acepta solo KATA', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_iaido: 'KYU_3' },
        ['IAIDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'IAIDO',
        examinadores: ['María García'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'IAIDO',
        instancia: 'KATA',
        aprobado: true,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'IAIDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(400);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'IAIDO',
        instancia: 'ESCRITO',
        aprobado: true,
      }).expect(400);
    });

    it('IAIDO target DAN_1 acepta KATA y ESCRITO pero no PRACTICO', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_iaido: 'KYU_1' },
        ['IAIDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'IAIDO',
        examinadores: ['María García'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'IAIDO',
        instancia: 'KATA',
        aprobado: true,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'IAIDO',
        instancia: 'ESCRITO',
        aprobado: true,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'IAIDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(400);
    });

    it('rechaza cargar KATA sin aprobar PRÁCTICO', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'KYU_2' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'KATA',
        aprobado: true,
      }).expect(400);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: false,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'KATA',
        aprobado: true,
      }).expect(400);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'KATA',
        aprobado: true,
      }).expect(201);
    });

    it('rechaza cargar ESCRITO sin aprobar PRÁCTICO y KATA', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'KYU_1' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'ESCRITO',
        aprobado: true,
      }).expect(400);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'ESCRITO',
        aprobado: true,
      }).expect(400);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'KATA',
        aprobado: true,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'ESCRITO',
        aprobado: true,
      }).expect(201);
    });
  });

  describe('Avance secuencial (POST /admin/resultados/avance)', () => {
    const cargarAvance = (adminToken: string, body: Record<string, unknown>) =>
      request(app.getHttpServer())
        .post('/api/admin/resultados/avance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body);

    it('marca hasta KATA rellenando las instancias anteriores', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'KYU_2' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarAvance(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        aprobada_hasta: 'KATA',
      }).expect(201);

      const res = await getResultados(admin.token, evento.id).expect(200);
      const instancias = res.body[0].instancias;
      expect(instancias).toHaveLength(2);
      expect(instancias[0]).toMatchObject({
        instancia: 'PRACTICO',
        aprobado: true,
      });
      expect(instancias[1]).toMatchObject({
        instancia: 'KATA',
        aprobado: true,
      });
    });

    it('bajar la barra vuelve las instancias posteriores a pendiente', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'KYU_2' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarAvance(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        aprobada_hasta: 'KATA',
      }).expect(201);
      await cargarAvance(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        aprobada_hasta: 'PRACTICO',
      }).expect(201);

      const res = await getResultados(admin.token, evento.id).expect(200);
      const instancias = res.body[0].instancias;
      expect(instancias[0]).toMatchObject({
        instancia: 'PRACTICO',
        aprobado: true,
      });
      expect(instancias[1]).toMatchObject({
        instancia: 'KATA',
        aprobado: null,
      });
    });

    it('marcar Desaprobado registra la falla en la primera no aprobada', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'KYU_1' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarAvance(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        aprobada_hasta: 'KATA',
      }).expect(201);
      await cargarAvance(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        aprobada_hasta: 'KATA',
        desaprobada: 'ESCRITO',
      }).expect(201);

      const res = await getResultados(admin.token, evento.id).expect(200);
      const instancias = res.body[0].instancias;
      expect(instancias).toHaveLength(3);
      expect(instancias[0]).toMatchObject({
        instancia: 'PRACTICO',
        aprobado: true,
      });
      expect(instancias[1]).toMatchObject({
        instancia: 'KATA',
        aprobado: true,
      });
      expect(instancias[2]).toMatchObject({
        instancia: 'ESCRITO',
        aprobado: false,
      });
    });

    it('rechaza marcar Desaprobado sin tener aprobadas las anteriores', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'KYU_1' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarAvance(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        desaprobada: 'KATA',
      }).expect(400);

      await cargarAvance(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        aprobada_hasta: 'PRACTICO',
        desaprobada: 'ESCRITO',
      }).expect(400);
    });

    it('requiere seleccionar mesa cuando hay varias compatibles', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);
      const mesaB = await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Ana López'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarAvance(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        aprobada_hasta: 'PRACTICO',
      }).expect(400);

      await cargarAvance(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        aprobada_hasta: 'PRACTICO',
        mesa_id: mesaB.body.id,
      }).expect(201);
    });

    it('rechaza modificar resultados cuando la graduación fue otorgada por diploma', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await registrarPago(admin.token, insc.id, 'KENDO').expect(201);

      await prisma.registroExamen.update({
        where: {
          inscripcion_id_disciplina: {
            inscripcion_id: insc.id,
            disciplina: 'KENDO',
          },
        },
        data: { graduacion_aplicada: true },
      });

      await cargarAvance(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        aprobada_hasta: 'PRACTICO',
      }).expect(400);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: false,
      }).expect(400);
    });
  });

  describe('GET /admin/examenes/:id/resultados', () => {
    it('devuelve el shape agrupado por candidato con instancias pendientes', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );

      const res = await getResultados(admin.token, insc.evento_id).expect(200);

      expect(res.body).toEqual([
        {
          inscripcion_id: insc.id,
          usuario: {
            id: expect.any(Number),
            nombre: 'Test User',
            email: expect.any(String),
            dni: expect.any(String),
          },
          instancias: [
            {
              disciplina: 'KENDO',
              graduacion: 'KYU_3',
              instancia: 'PRACTICO',
              aprobado: null,
              mesa_id: null,
              registro_pagado: false,
              graduacion_aplicada: false,
            },
          ],
        },
      ]);
    });

    it('refleja las instancias aprobadas y el registro de pago en la disciplina completa', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'KYU_2' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'KATA',
        aprobado: true,
      }).expect(201);
      await registrarPago(admin.token, insc.id, 'KENDO').expect(201);

      const res = await getResultados(admin.token, evento.id).expect(200);

      expect(res.body[0].instancias).toContainEqual({
        disciplina: 'KENDO',
        graduacion: 'KYU_1',
        instancia: 'PRACTICO',
        aprobado: true,
        mesa_id: expect.any(Number),
        registro_pagado: true,
        graduacion_aplicada: false,
      });
      expect(res.body[0].instancias).toContainEqual({
        disciplina: 'KENDO',
        graduacion: 'KYU_1',
        instancia: 'KATA',
        aprobado: true,
        mesa_id: expect.any(Number),
        registro_pagado: true,
        graduacion_aplicada: false,
      });
    });
  });

  describe('Registro de pago (graduación diferida al diploma)', () => {
    it('registra el pago sin aplicar la graduación', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { user, evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await registrarPago(admin.token, insc.id, 'KENDO').expect(201);

      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.grad_kendo).toBe('SIN_GRADUACION');
      expect(updated?.f_grad_kendo).toBeNull();

      const historial = await prisma.historialGraduacion.findMany({
        where: { usuario_id: user.id },
      });
      expect(historial).toHaveLength(0);

      const registro = await prisma.registroExamen.findUnique({
        where: {
          inscripcion_id_disciplina: {
            inscripcion_id: insc.id,
            disciplina: 'KENDO',
          },
        },
      });
      expect(registro?.pagado).toBe(true);
      expect(registro?.graduacion_aplicada).toBe(false);

      const res = await getResultados(admin.token, evento.id).expect(200);
      expect(res.body[0].instancias[0]).toMatchObject({
        aprobado: true,
        registro_pagado: true,
        graduacion_aplicada: false,
      });
    });

    it('registra el pago cuando todas las instancias de la disciplina están aprobadas', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { user, evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'KYU_2' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'KATA',
        aprobado: true,
      }).expect(201);
      await registrarPago(admin.token, insc.id, 'KENDO').expect(201);

      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.grad_kendo).toBe('KYU_2');

      const registro = await prisma.registroExamen.findUnique({
        where: {
          inscripcion_id_disciplina: {
            inscripcion_id: insc.id,
            disciplina: 'KENDO',
          },
        },
      });
      expect(registro?.pagado).toBe(true);
      expect(registro?.graduacion_aplicada).toBe(false);
    });

    it('rechaza registrar el pago si una instancia está desaprobada', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { user, evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: false,
      }).expect(201);
      await registrarPago(admin.token, insc.id, 'KENDO').expect(400);

      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.grad_kendo).toBe('SIN_GRADUACION');

      const historial = await prisma.historialGraduacion.findMany({
        where: { usuario_id: user.id },
      });
      expect(historial).toHaveLength(0);

      const registro = await prisma.registroExamen.findUnique({
        where: {
          inscripcion_id_disciplina: {
            inscripcion_id: insc.id,
            disciplina: 'KENDO',
          },
        },
      });
      expect(registro).toBeNull();
    });

    it('rechaza registrar el pago si faltan instancias aprobadas', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { user, evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'KYU_2' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await registrarPago(admin.token, insc.id, 'KENDO').expect(400);

      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.grad_kendo).toBe('KYU_2');
    });

    it('no aplica la graduación si todas las instancias están aprobadas pero no hay registro pagado', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { user, evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);

      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.grad_kendo).toBe('SIN_GRADUACION');
    });

    it('registrar el pago dos veces es idempotente', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { user, evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await registrarPago(admin.token, insc.id, 'KENDO').expect(201);
      await registrarPago(admin.token, insc.id, 'KENDO').expect(201);

      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.grad_kendo).toBe('SIN_GRADUACION');

      const historial = await prisma.historialGraduacion.findMany({
        where: { usuario_id: user.id },
      });
      expect(historial).toHaveLength(0);

      const registro = await prisma.registroExamen.findUnique({
        where: {
          inscripcion_id_disciplina: {
            inscripcion_id: insc.id,
            disciplina: 'KENDO',
          },
        },
      });
      expect(registro?.pagado).toBe(true);
      expect(registro?.graduacion_aplicada).toBe(false);
    });

    it('rechaza registrar el pago si alguna instancia está desaprobada', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { user, evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'KYU_2' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_8',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'KATA',
        aprobado: false,
      }).expect(201);
      await registrarPago(admin.token, insc.id, 'KENDO').expect(400);

      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.grad_kendo).toBe('KYU_2');
    });

    it('en un examen multi-disciplina ninguna graduación se efectiviza hasta el diploma', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { user, evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION', grad_iaido: 'SIN_GRADUACION' },
        ['KENDO', 'IAIDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);
      await crearMesa(admin.token, evento.id, {
        disciplina: 'IAIDO',
        examinadores: ['María García'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_1',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await registrarPago(admin.token, insc.id, 'KENDO').expect(201);

      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.grad_kendo).toBe('SIN_GRADUACION');
      expect(updated?.grad_iaido).toBe('SIN_GRADUACION');

      const historial = await prisma.historialGraduacion.findMany({
        where: { usuario_id: user.id },
      });
      expect(historial).toHaveLength(0);
    });

    it('la aprobación de IAIDO no efectiviza la graduación hasta el diploma', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { user, evento, insc } = await setupCandidato(
        admin.token,
        { grad_iaido: 'SIN_GRADUACION' },
        ['IAIDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'IAIDO',
        examinadores: ['María García'],
        grad_min: 'KYU_3',
        grad_max: 'DAN_1',
      }).expect(201);

      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'IAIDO',
        instancia: 'KATA',
        aprobado: true,
      }).expect(201);
      await registrarPago(admin.token, insc.id, 'IAIDO').expect(201);

      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.grad_iaido).toBe('SIN_GRADUACION');

      const historial = await prisma.historialGraduacion.findMany({
        where: { usuario_id: user.id },
      });
      expect(historial).toHaveLength(0);
    });
  });

  describe('Permisos', () => {
    it('rechaza que un ADMIN_ASOCIACION cargue un resultado', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      const { token: assocToken } = await createTestUser(prisma, jwt, {
        rol: 'ADMIN_ASOCIACION',
        estado_pago: true,
      });
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      await cargarResultado(assocToken, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(403);
    });

    it('rechaza que un ADMIN_ASOCIACION consulte los resultados', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      const { token: assocToken } = await createTestUser(prisma, jwt, {
        rol: 'ADMIN_ASOCIACION',
        estado_pago: true,
      });

      await getResultados(assocToken, evento.id).expect(403);
    });

    it('rechaza consultar resultados sin token', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );

      await request(app.getHttpServer())
        .get(`/api/admin/examenes/${evento.id}/resultados`)
        .expect(401);
    });
  });

  describe('Auditoría', () => {
    it('registra la creación de una mesa', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const evento = await crearExamen(admin.token, ['KENDO']);
      await crearMesa(admin.token, evento.body.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/admin/auditoria')
        .query({ entidad: 'MesaExaminadora' })
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.datos[0].accion).toBe('CREATE');
      expect(res.body.datos[0].entidad).toBe('MesaExaminadora');
    });

    it('registra la carga de un resultado', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/admin/auditoria')
        .query({ entidad: 'ResultadoExamen' })
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.datos[0].accion).toBe('UPSERT');
      expect(res.body.datos[0].entidad).toBe('ResultadoExamen');
    });

    it('registra el pago de un registro', async () => {
      const admin = await createAdminGeneral(prisma, jwt);
      const { evento, insc } = await setupCandidato(
        admin.token,
        { grad_kendo: 'SIN_GRADUACION' },
        ['KENDO'],
      );
      await crearMesa(admin.token, evento.id, {
        disciplina: 'KENDO',
        examinadores: ['Juan Pérez'],
        grad_min: 'KYU_3',
        grad_max: 'KYU_1',
      }).expect(201);
      await cargarResultado(admin.token, {
        inscripcion_id: insc.id,
        disciplina: 'KENDO',
        instancia: 'PRACTICO',
        aprobado: true,
      }).expect(201);
      await registrarPago(admin.token, insc.id, 'KENDO').expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/admin/auditoria')
        .query({ entidad: 'RegistroExamen' })
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.datos[0].accion).toBe('UPSERT');
      expect(res.body.datos[0].entidad).toBe('RegistroExamen');
    });
  });
});
