import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-utils';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    ({ app } = await createTestApp());
  });

  it('/ (GET) debería retornar health check', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });

  afterEach(async () => {
    await app.close();
  });
});
