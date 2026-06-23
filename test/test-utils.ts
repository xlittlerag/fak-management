import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { validationMessages } from '../src/utils/validation-messages';
import * as bcrypt from 'bcrypt';

export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
  jwt: JwtService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) => {
      const messages = errors.flatMap((e) =>
        Object.values(e.constraints || {}).map(
          (c) => validationMessages[c] || c,
        ),
      );
      return new BadRequestException(messages);
    },
  }));
  await app.init();

  const prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);

  return { app, prisma, jwt };
}

export async function cleanupDb(prisma: PrismaService) {
  await prisma.historialGraduacion.deleteMany();
  await prisma.inscripcionEvento.deleteMany();
  await prisma.certificadoExterno.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.dojo.updateMany({ where: { deleted_at: { not: null } }, data: { deleted_at: null } });
  await prisma.dojo.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.asociacion.deleteMany();
  await prisma.cuotaGlobal.deleteMany();
  await prisma.adminGeneral.deleteMany();
}

export async function createAdminGeneral(
  prisma: PrismaService,
  jwt: JwtService,
) {
  const password = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.adminGeneral.create({
    data: {
      dni: '00000000',
      password,
    },
  });

  const token = jwt.sign({
    sub: admin.id,
    email: 'admin@kendo-manager',
    rol: 'ADMIN_GENERAL',
    asociacion_id: 0,
  });

  return { admin, token };
}

export async function createTestUser(
  prisma: PrismaService,
  jwt: JwtService,
  overrides: any = {},
) {
  const password = await bcrypt.hash(overrides.password || 'Password123!', 10);

  let asociacionId = overrides.asociacion_id;
  let dojoId = overrides.dojo_id;

  if (!asociacionId) {
    const assoc = await prisma.asociacion.create({
      data: { nombre: 'Test Association' },
    });
    asociacionId = assoc.id;
  }

  if (!dojoId) {
    const dojo = await prisma.dojo.create({
      data: { nombre: 'Test Dojo', asociacion_id: asociacionId },
    });
    dojoId = dojo.id;
  }

  const user = await prisma.usuario.create({
    data: {
      email: overrides.email || `test-${Date.now()}@example.com`,
      password,
      nombre: overrides.nombre || 'Test',
      apellido: overrides.apellido || 'User',
      dni: overrides.dni || `DNI-${Date.now()}`,
      fecha_nacimiento: new Date('1990-01-01'),
      sexo: overrides.sexo || 'MASCULINO',
      rol: overrides.rol || 'BASICO',
      asociacion_id: asociacionId,
      dojo_id: dojoId,
      estado_reg: overrides.estado_reg || 'APROBADO',
      calle_altura: overrides.calle_altura || 'Calle Falsa 123',
      ciudad: overrides.ciudad || 'Ciudad Test',
      provincia: overrides.provincia || 'BUENOS_AIRES',
      codigo_postal: overrides.codigo_postal || '1234',
    },
  });

  const token = jwt.sign({
    sub: user.id,
    email: user.email,
    rol: user.rol,
    asociacion_id: user.asociacion_id,
  });

  return { user, token, asociacionId };
}
