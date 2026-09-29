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

describe('Auth (e2e)', () => {
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

  describe('POST /auth/register', () => {
    it('should create a user with PENDIENTE_APROBACION and BASICO role', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Test Assoc' },
      });
      const dojo = await prisma.dojo.create({
        data: { nombre: 'Test Dojo', asociacion_id: assoc.id },
      });

      const registerDto = {
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@example.com',
        password: 'Password123!',
        dni: '12345678',
        fecha_nacimiento: '1995-05-15',
        sexo: 'MASCULINO',
        asociacion_id: assoc.id,
        dojo_id: dojo.id,
        calle_altura: 'Av. Siempre Viva 742',
        ciudad: 'Springfield',
        provincia: 'BUENOS_AIRES',
        codigo_postal: '1234',
        telefono: '1199999999',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(registerDto)
        .expect(201);

      const user = await prisma.usuario.findUnique({
        where: { email: 'juan@example.com' },
      });
      expect(user).toBeDefined();
      expect(user?.rol).toBe('BASICO');
      expect(user?.estado_reg).toBe('PENDIENTE_APROBACION');
      expect(user?.grad_kendo).toBe('SIN_GRADUACION');
    });

    it('should return 409 if email or DNI already exists', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Test Assoc' },
      });
      const dojo = await prisma.dojo.create({
        data: { nombre: 'Test Dojo', asociacion_id: assoc.id },
      });
      await createTestUser(prisma, jwt, {
        email: 'dup@example.com',
        dni: 'D123',
        asociacion_id: assoc.id,
        dojo_id: dojo.id,
      });

      const registerDto = {
        nombre: 'Dup',
        apellido: 'User',
        email: 'dup@example.com',
        password: 'Password123!',
        dni: 'D123',
        fecha_nacimiento: '1995-05-15',
        sexo: 'MASCULINO',
        asociacion_id: assoc.id,
        dojo_id: dojo.id,
        calle_altura: 'Av. Siempre Viva 742',
        ciudad: 'Springfield',
        provincia: 'BUENOS_AIRES',
        codigo_postal: '1234',
        telefono: '1199999999',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(registerDto)
        .expect(409);
    });

    it('should return 400 with Spanish validation errors for empty fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body.message.length).toBeGreaterThan(0);
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/obligatorio/)]),
      );
    });
  });

  describe('POST /auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ dni: 'nonexistent', password: 'wrong' })
        .expect(401);
    });

    it('should return 403 if user is PENDIENTE_APROBACION', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Test' },
      });
      await createTestUser(prisma, jwt, {
        email: 'pending@example.com',
        dni: 'P123',
        password: 'Password123!',
        estado_reg: 'PENDIENTE_APROBACION',
        asociacion_id: assoc.id,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ dni: 'P123', password: 'Password123!' })
        .expect(403);

      expect(response.body.message).toContain('aprobación');
    });

    it('should return 403 if user is RECHAZADO', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Test' },
      });
      await createTestUser(prisma, jwt, {
        email: 'rejected@example.com',
        dni: 'R123',
        password: 'Password123!',
        estado_reg: 'RECHAZADO',
        asociacion_id: assoc.id,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ dni: 'R123', password: 'Password123!' })
        .expect(403);

      expect(response.body.message).toContain('rechazada');
    });

    it('should return 200 and a JWT if user is APROBADO', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Test' },
      });
      const user = await createTestUser(prisma, jwt, {
        email: 'approved@example.com',
        dni: 'A123',
        password: 'Password123!',
        estado_reg: 'APROBADO',
        asociacion_id: assoc.id,
      });

      const agent = request.agent(app.getHttpServer());
      const response = await agent
        .post('/api/auth/login')
        .send({ dni: 'A123', password: 'Password123!' })
        .expect(200);

      // El JWT viaja solo en la cookie httpOnly, nunca en el cuerpo.
      expect(response.body).not.toHaveProperty('access_token');
      const cookies: string[] = response.headers['set-cookie'] ?? [];
      expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);

      const session = await agent.get('/api/auth/session').expect(200);
      expect(session.body.email).toBe(user.user.email);
    });
  });

  describe('POST /auth/admin-login', () => {
    it('should return 200 and a JWT for valid admin password', async () => {
      await createAdminGeneral(prisma, jwt);

      const agent = request.agent(app.getHttpServer());
      const response = await agent
        .post('/api/auth/admin-login')
        .send({ password: 'Admin123!' })
        .expect(200);

      // El JWT viaja solo en la cookie httpOnly, nunca en el cuerpo.
      expect(response.body).not.toHaveProperty('access_token');

      const session = await agent.get('/api/auth/session').expect(200);
      expect(session.body.rol).toBe('ADMIN_GENERAL');
    });

    it('should return 401 for invalid admin password', async () => {
      await createAdminGeneral(prisma, jwt);

      await request(app.getHttpServer())
        .post('/api/auth/admin-login')
        .send({ password: 'wrong-password' })
        .expect(401);
    });

    it('should return 401 when no admins exist', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/admin-login')
        .send({ password: 'Admin123!' })
        .expect(401);
    });
  });

  describe('POST /auth/reset-password/request', () => {
    it('should set estado_blanqueo to PENDIENTE for existing user', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Test' },
      });
      const { user } = await createTestUser(prisma, jwt, {
        dni: 'RESET01',
        asociacion_id: assoc.id,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/reset-password/request')
        .send({ dni: 'RESET01' })
        .expect(201);

      expect(response.body).toEqual({ mensaje: expect.any(String) });

      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.estado_blanqueo).toBe('PENDIENTE');
    });

    it('responde genérico aunque el DNI no exista (anti-enumeración)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/reset-password/request')
        .send({ dni: 'NONEXISTENT' })
        .expect(201);
      expect(res.body).toEqual({ mensaje: expect.any(String) });
    });

    it('no persiste el hash del código en la auditoría', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Test' },
      });
      const { user } = await createTestUser(prisma, jwt, {
        dni: 'RESET04',
        asociacion_id: assoc.id,
      });

      await request(app.getHttpServer())
        .post('/api/auth/reset-password/request')
        .send({ dni: 'RESET04' })
        .expect(201);

      const log = await prisma.auditLog.findFirst({
        where: { entidad: 'Usuario', entidad_id: user.id },
        orderBy: { id: 'desc' },
      });
      expect(log).not.toBeNull();
      const datos = log!.datos_nuevos as Record<string, unknown>;
      expect(datos.codigo_blanqueo).toBe('[REDACTED]');
      // password ni siquiera llega (omit de Prisma), pero no debe filtrarse.
      expect(datos.password).toBeUndefined();
    });

    it('rechaza contraseña nueva de menos de 12 caracteres', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Test' },
      });
      await createTestUser(prisma, jwt, {
        dni: 'RESET03',
        asociacion_id: assoc.id,
      });

      await request(app.getHttpServer())
        .post('/api/auth/reset-password/request')
        .send({ dni: 'RESET03' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/api/auth/reset-password/complete')
        .send({ dni: 'RESET03', codigo: 'ABCDEFGH', nueva_password: 'corta' })
        .expect(400);
      expect(JSON.stringify(res.body)).toMatch(/12 caracteres/);
    });

    it('invalida el código tras 5 intentos fallidos', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Test' },
      });
      const { user } = await createTestUser(prisma, jwt, {
        dni: 'RESET02',
        asociacion_id: assoc.id,
      });

      await request(app.getHttpServer())
        .post('/api/auth/reset-password/request')
        .send({ dni: 'RESET02' })
        .expect(201);

      const server = request(app.getHttpServer());
      for (let i = 0; i < 5; i++) {
        await server
          .post('/api/auth/reset-password/complete')
          .send({
            dni: 'RESET02',
            codigo: 'ERRONEO1',
            nueva_password: 'Password123!',
          })
          .expect(401);
      }
      const bloqueado = await server
        .post('/api/auth/reset-password/complete')
        .send({
          dni: 'RESET02',
          codigo: 'ERRONEO1',
          nueva_password: 'Password123!',
        })
        .expect(401);
      expect(bloqueado.body.message).toMatch(/cantidad de intentos/);

      const updated = await prisma.usuario.findUnique({
        where: { id: user.id },
      });
      expect(updated?.codigo_blanqueo).toBeNull();
    });
  });

  describe('Cookie de sesión httpOnly', () => {
    it('el login emite la cookie HttpOnly y esta autentica GET /auth/session', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Test' },
      });
      await createTestUser(prisma, jwt, {
        email: 'cookie@example.com',
        dni: 'C123',
        password: 'Password123!',
        estado_reg: 'APROBADO',
        asociacion_id: assoc.id,
      });

      const agent = request.agent(app.getHttpServer());
      const loginRes = await agent
        .post('/api/auth/login')
        .send({ dni: 'C123', password: 'Password123!' })
        .expect(200);

      // El cuerpo ya no expone el token: solo la cookie lo transporta.
      expect(loginRes.body).not.toHaveProperty('access_token');

      const cookies: string[] = loginRes.headers['set-cookie'] ?? [];
      const session = cookies.find((c) => c.startsWith('access_token='));
      expect(session).toBeDefined();
      expect(session).toMatch(/HttpOnly/i);
      expect(session).toMatch(/SameSite=Lax/i);

      const sessionRes = await agent.get('/api/auth/session').expect(200);
      expect(sessionRes.body.email).toBe('cookie@example.com');
    });

    it('un origen no permitido no recibe concesión CORS con credenciales', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/session')
        .set('Origin', 'https://sitio-malicioso.example')
        .expect(401);

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('el logout limpia la cookie y la sesión deja de ser válida', async () => {
      const assoc = await prisma.asociacion.create({
        data: { nombre: 'Test' },
      });
      await createTestUser(prisma, jwt, {
        email: 'logout@example.com',
        dni: 'L123',
        password: 'Password123!',
        estado_reg: 'APROBADO',
        asociacion_id: assoc.id,
      });

      const agent = request.agent(app.getHttpServer());
      await agent
        .post('/api/auth/login')
        .send({ dni: 'L123', password: 'Password123!' })
        .expect(200);
      await agent.get('/api/auth/session').expect(200);

      const logoutRes = await agent.post('/api/auth/logout').expect(200);
      expect(logoutRes.body).toEqual({ mensaje: expect.any(String) });
      const cookies: string[] = logoutRes.headers['set-cookie'] ?? [];
      expect(cookies.some((c) => c.startsWith('access_token=;'))).toBe(true);

      await agent.get('/api/auth/session').expect(401);
    });

    it('el encabezado Bearer continúa siendo aceptado por compatibilidad', async () => {
      const { token } = await createTestUser(prisma, jwt);

      const res = await request(app.getHttpServer())
        .get('/api/auth/session')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('email');
    });
  });
});
