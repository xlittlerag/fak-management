import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createTestApp, cleanupDb, createTestUser } from './test-utils';

describe('Dojos (e2e)', () => {
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

  it('should return 400 when deleting a dojo with practitioners', async () => {
    const admin = await createTestUser(prisma, jwt, { rol: 'ADMIN_GENERAL' });
    const assoc = await prisma.asociacion.create({ data: { nombre: 'Federacion' } });
    const dojo = await prisma.dojo.create({ data: { nombre: 'Dojo de prueba', asociacion_id: assoc.id } });
    
    await createTestUser(prisma, jwt, { 
      dni: 'practitioner1',
      asociacion_id: assoc.id, 
      dojo_id: dojo.id 
    });

    await request(app.getHttpServer())
      .delete(`/api/dojos/${dojo.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(400);
  });

  it('should create a dojo when provided with a valid association_id', async () => {
    const admin = await createTestUser(prisma, jwt, { rol: 'ADMIN_GENERAL' });
    const assoc = await prisma.asociacion.create({ data: { nombre: 'Nueva Asociacion' } });

    await request(app.getHttpServer())
      .post('/api/dojos')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ nombre: 'Nuevo Dojo', asociacion_id: assoc.id })
      .expect(201);
  });
});
