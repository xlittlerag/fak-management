import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TwoFactorService } from '../src/auth/two-factor.service';
import { createTestApp, cleanupDb, createAdminGeneral } from './test-utils';

// Clave de cifrado solo para tests (64 hex). dotenv no pisa variables ya
// definidas, así que ConfigService la toma al crear la app.
process.env.TOTP_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('Admin 2FA (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let twoFactor: TwoFactorService;

  beforeAll(async () => {
    ({ app, prisma, jwt } = await createTestApp());
    twoFactor = app.get(TwoFactorService);
  });

  beforeEach(async () => {
    await cleanupDb(prisma);
  });

  afterAll(async () => {
    await cleanupDb(prisma);
    await app.close();
  });

  async function habilitar2fa(agent: request.Agent, secretoPlano: string) {
    const codigo = twoFactor.generarCodigo(secretoPlano);
    const res = await agent
      .post('/api/auth/admin-2fa/confirmar')
      .send({ codigo })
      .expect(200);
    expect(res.body.codigos_respaldo).toHaveLength(10);
    return res.body.codigos_respaldo as string[];
  }

  it('admin-login sin 2FA crea sesión directamente (compatibilidad)', async () => {
    await createAdminGeneral(prisma, jwt);
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/admin-login')
      .send({ password: 'Admin123!' })
      .expect(200);
    const session = await agent.get('/api/auth/session').expect(200);
    expect(session.body.rol).toBe('ADMIN_GENERAL');
  });

  it('flujo completo: setup -> confirmar -> login en dos pasos -> verificar', async () => {
    await createAdminGeneral(prisma, jwt);
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/admin-login')
      .send({ password: 'Admin123!' })
      .expect(200);

    const setup = await agent.post('/api/auth/admin-2fa/setup').expect(201);
    expect(setup.body.otpauth_url).toMatch(/^otpauth:\/\/totp\//);
    expect(setup.body.qr).toMatch(/^data:image\/png;base64,/);
    expect(typeof setup.body.secreto_manual).toBe('string');

    // El secreto se guarda cifrado, nunca en texto plano.
    const guardado = await prisma.adminGeneral.findFirstOrThrow();
    expect(guardado.totp_secreto).not.toBe(setup.body.secreto_manual);
    expect(guardado.totp_habilitado).toBe(false);

    await habilitar2fa(agent, setup.body.secreto_manual);

    const estado = await agent.get('/api/auth/admin-2fa/estado').expect(200);
    expect(estado.body).toMatchObject({
      habilitado: true,
      respaldos_restantes: 10,
    });

    // Segundo agente: primer paso devuelve token pendiente sin crear sesión.
    const agent2 = request.agent(app.getHttpServer());
    const paso1 = await agent2
      .post('/api/auth/admin-login')
      .send({ password: 'Admin123!' })
      .expect(200);
    expect(paso1.body.requiere_2fa).toBe(true);
    expect(typeof paso1.body.token_pendiente).toBe('string');
    await agent2.get('/api/auth/session').expect(401);

    // El token pendiente no autoriza rutas protegidas.
    await request(app.getHttpServer())
      .get('/api/auth/admin-2fa/estado')
      .set('Authorization', `Bearer ${paso1.body.token_pendiente}`)
      .expect(401);

    // Segundo paso con TOTP vigente crea la sesión.
    const codigo = twoFactor.generarCodigo(setup.body.secreto_manual);
    await agent2
      .post('/api/auth/admin-2fa/verificar')
      .send({ token_pendiente: paso1.body.token_pendiente, codigo })
      .expect(200);
    const session = await agent2.get('/api/auth/session').expect(200);
    expect(session.body.rol).toBe('ADMIN_GENERAL');
  });

  it('un código incorrecto al confirmar el setup no cierra la sesión', async () => {
    await createAdminGeneral(prisma, jwt);
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/admin-login')
      .send({ password: 'Admin123!' })
      .expect(200);
    const setup = await agent.post('/api/auth/admin-2fa/setup').expect(201);

    await agent
      .post('/api/auth/admin-2fa/confirmar')
      .send({ codigo: '000000' })
      .expect(400);

    // El error de validación no invalida la cookie de sesión.
    await agent.get('/api/auth/session').expect(200);

    // La activación sigue en curso y puede confirmarse con el código correcto.
    await habilitar2fa(agent, setup.body.secreto_manual);
    const estado = await agent.get('/api/auth/admin-2fa/estado').expect(200);
    expect(estado.body).toMatchObject({
      habilitado: true,
      respaldos_restantes: 10,
    });
  });

  it('rechaza código incorrecto y token pendiente inválido', async () => {
    await createAdminGeneral(prisma, jwt);
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/admin-login')
      .send({ password: 'Admin123!' })
      .expect(200);
    const setup = await agent.post('/api/auth/admin-2fa/setup').expect(201);
    await habilitar2fa(agent, setup.body.secreto_manual);

    const paso1 = await request(app.getHttpServer())
      .post('/api/auth/admin-login')
      .send({ password: 'Admin123!' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/admin-2fa/verificar')
      .send({ token_pendiente: paso1.body.token_pendiente, codigo: '000000' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/admin-2fa/verificar')
      .send({ token_pendiente: 'token-invalido', codigo: '123456' })
      .expect(401);
  });

  it('acepta código de respaldo una sola vez y lo quema', async () => {
    await createAdminGeneral(prisma, jwt);
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/admin-login')
      .send({ password: 'Admin123!' })
      .expect(200);
    const setup = await agent.post('/api/auth/admin-2fa/setup').expect(201);
    const respaldos = await habilitar2fa(agent, setup.body.secreto_manual);

    const login = () =>
      request(app.getHttpServer())
        .post('/api/auth/admin-login')
        .send({ password: 'Admin123!' });

    const paso1 = await login().expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/admin-2fa/verificar')
      .send({
        token_pendiente: paso1.body.token_pendiente,
        codigo: respaldos[0],
      })
      .expect(200);

    const estado = await agent.get('/api/auth/admin-2fa/estado').expect(200);
    expect(estado.body.respaldos_restantes).toBe(9);

    // Reutilizar el mismo respaldo falla.
    const paso2 = await login().expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/admin-2fa/verificar')
      .send({
        token_pendiente: paso2.body.token_pendiente,
        codigo: respaldos[0],
      })
      .expect(401);
  });

  it('no permite setup duplicado y deshabilitar vuelve al login simple', async () => {
    await createAdminGeneral(prisma, jwt);
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/admin-login')
      .send({ password: 'Admin123!' })
      .expect(200);
    const setup = await agent.post('/api/auth/admin-2fa/setup').expect(201);
    await habilitar2fa(agent, setup.body.secreto_manual);

    await agent.post('/api/auth/admin-2fa/setup').expect(409);

    await agent
      .post('/api/auth/admin-2fa/deshabilitar')
      .send({ password: 'contraseña-errónea' })
      .expect(400);
    // Un error de validación no invalida la sesión.
    await agent.get('/api/auth/session').expect(200);
    await agent
      .post('/api/auth/admin-2fa/deshabilitar')
      .send({ password: 'Admin123!' })
      .expect(200);

    // Login vuelve a ser de un solo paso.
    const agent2 = request.agent(app.getHttpServer());
    const res = await agent2
      .post('/api/auth/admin-login')
      .send({ password: 'Admin123!' })
      .expect(200);
    expect(res.body.requiere_2fa).toBeUndefined();
    const session = await agent2.get('/api/auth/session').expect(200);
    expect(session.body.rol).toBe('ADMIN_GENERAL');
  });

  it('regenerar respaldos invalida los anteriores', async () => {
    await createAdminGeneral(prisma, jwt);
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/admin-login')
      .send({ password: 'Admin123!' })
      .expect(200);
    const setup = await agent.post('/api/auth/admin-2fa/setup').expect(201);
    const viejos = await habilitar2fa(agent, setup.body.secreto_manual);

    const regen = await agent
      .post('/api/auth/admin-2fa/respaldo/regenerar')
      .expect(200);
    expect(regen.body.codigos_respaldo).toHaveLength(10);
    expect(regen.body.codigos_respaldo).not.toContain(viejos[0]);

    const paso1 = await request(app.getHttpServer())
      .post('/api/auth/admin-login')
      .send({ password: 'Admin123!' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/admin-2fa/verificar')
      .send({ token_pendiente: paso1.body.token_pendiente, codigo: viejos[0] })
      .expect(401);
  });
});
