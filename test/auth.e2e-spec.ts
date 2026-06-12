import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createTestApp, cleanupDb, createTestUser } from './test-utils';
import * as bcrypt from 'bcrypt';

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
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should create a user with PENDIENTE_APROBACION and BASICO role', async () => {
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test Assoc' } });

      const registerDto = {
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@example.com',
        password: 'Password123!',
        dni: '12345678',
        fecha_nacimiento: '1995-05-15',
        genero: 'MASCULINO',
        asociacion_id: assoc.id,
        calle_altura: 'Av. Siempre Viva 742',
        ciudad: 'Springfield',
        provincia: 'BUENOS_AIRES',
        codigo_postal: '1234',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      const user = await prisma.usuario.findUnique({ where: { email: 'juan@example.com' } });
      expect(user).toBeDefined();
      expect(user?.rol).toBe('BASICO');
      expect(user?.estado_reg).toBe('PENDIENTE_APROBACION');
      expect(user?.grad_kendo).toBe('SIN_GRADUACION');
    });

    it('should return 409 if email or DNI already exists', async () => {
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test Assoc' } });
      await createTestUser(prisma, jwt, { email: 'dup@example.com', dni: 'D123', asociacion_id: assoc.id });

      const registerDto = {
        nombre: 'Dup',
        apellido: 'User',
        email: 'dup@example.com',
        password: 'Password123!',
        dni: 'D123',
        fecha_nacimiento: '1995-05-15',
        genero: 'MASCULINO',
        asociacion_id: assoc.id,
        calle_altura: 'Av. Siempre Viva 742',
        ciudad: 'Springfield',
        provincia: 'BUENOS_AIRES',
        codigo_postal: '1234',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ dni: 'nonexistent', password: 'wrong' })
        .expect(401);
      });

      it('should return 403 if user is PENDIENTE_APROBACION', async () => {
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test' } });
      const user = await createTestUser(prisma, jwt, { 
        email: 'pending@example.com', 
        dni: 'P123',
        password: 'Password123!',
        estado_reg: 'PENDIENTE_APROBACION',
        asociacion_id: assoc.id 
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ dni: 'P123', password: 'Password123!' })
        .expect(403);


      expect(response.body.message).toContain('aprobación');
    });

    it('should return 200 and a JWT if user is APROBADO', async () => {
      const assoc = await prisma.asociacion.create({ data: { nombre: 'Test' } });
      const user = await createTestUser(prisma, jwt, { 
        email: 'approved@example.com', 
        dni: 'A123',
        password: 'Password123!',
        estado_reg: 'APROBADO',
        asociacion_id: assoc.id 
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ dni: 'A123', password: 'Password123!' })
        .expect(201); // Or 200, spec says 200/201

      expect(response.body).toHaveProperty('access_token');
      
      const decoded = jwt.decode(response.body.access_token) as any;
      expect(decoded.sub).toBe(user.user.id);
    });
  });
});
