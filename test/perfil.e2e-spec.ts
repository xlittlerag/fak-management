import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createTestApp, cleanupDb, createTestUser } from './test-utils';

describe('Perfil (e2e)', () => {
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

  describe('GET /usuarios/perfil', () => {
    it('should return own profile data', async () => {
      const { user, token } = await createTestUser(prisma, jwt, { 
        nombre: 'Original',
        email: 'profile@test.com' 
      });

      const response = await request(app.getHttpServer())
        .get('/usuarios/perfil')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.email).toBe('profile@test.com');
      expect(response.body.nombre).toBe('Original');
      expect(response.body).not.toHaveProperty('password');
    });
  });

  describe('PATCH /usuarios/perfil', () => {
    it('should update own profile data', async () => {
      const { user, token } = await createTestUser(prisma, jwt, { 
        nombre: 'Original',
        apellido: 'User'
      });

      const updateDto = {
        nombre: 'Updated',
        apellido: 'Modified',
        genero: 'FEMENINO'
      };

      await request(app.getHttpServer())
        .patch('/usuarios/perfil')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      const updated = await prisma.usuario.findUnique({ where: { id: user.id } });
      expect(updated?.nombre).toBe('Updated');
      expect(updated?.apellido).toBe('Modified');
      expect(updated?.genero).toBe('FEMENINO');
    });

    it('should update password if provided', async () => {
      const { user, token } = await createTestUser(prisma, jwt, { password: 'OldPassword123!' });

      await request(app.getHttpServer())
        .patch('/usuarios/perfil')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'NewPassword123!' })
        .expect(200);

      // Verify login works with new password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ dni: user.dni, password: 'NewPassword123!' })
        .expect(201);
    });
  });
});
