import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);

  return { app, prisma, jwt };
}

export async function cleanupDb(prisma: PrismaService) {
  // In reverse order of dependencies to satisfy FK constraints
  await prisma.historialGraduacion.deleteMany();
  await prisma.inscripcionEvento.deleteMany();
  await prisma.certificadoExterno.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.dojo.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.asociacion.deleteMany();
  await prisma.cuotaGlobal.deleteMany();
}

export async function createAdminGeneral(
  prisma: PrismaService,
  jwt: JwtService,
) {
  const password = await bcrypt.hash('Admin123!', 10);
  
  // Temporary setup for Admin
  // Needs association/dojo to pass FK constraints for now
  const assoc = await prisma.asociacion.create({ data: { nombre: 'Federacion' } });
  const dojo = await prisma.dojo.create({ data: { nombre: 'Central', asociacion_id: assoc.id } });

  const user = await prisma.usuario.create({
    data: {
      email: 'admin@test.com',
      password,
      nombre: 'Admin',
      apellido: 'General',
      dni: '00000000',
      fecha_nacimiento: new Date('1990-01-01'),
      sexo: 'MASCULINO',
      rol: 'ADMIN_GENERAL',
      asociacion_id: assoc.id,
      dojo_id: dojo.id,
      calle_altura: 'N/A',
      ciudad: 'N/A',
      provincia: 'BUENOS_AIRES',
      codigo_postal: '0000',
      estado_reg: 'APROBADO',
    },
  });

  const token = jwt.sign({
    sub: user.id,
    email: user.email,
    rol: user.rol,
    asociacion_id: user.asociacion_id,
  });

  return { user, token };
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
