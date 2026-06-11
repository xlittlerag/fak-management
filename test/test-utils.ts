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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);

  return { app, prisma, jwt };
}

export async function cleanupDb(prisma: PrismaService) {
  // In reverse order of dependencies
  await prisma.historialGraduacion.deleteMany();
  await prisma.inscripcionEvento.deleteMany();
  await prisma.certificadoExterno.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.asociacion.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.cuotaGlobal.deleteMany();
}

export async function createTestUser(
  prisma: PrismaService,
  jwt: JwtService,
  overrides: any = {},
) {
  const password = await bcrypt.hash(overrides.password || 'Password123!', 10);
  
  // Ensure we have an association
  let asociacionId = overrides.asociacion_id;
  if (!asociacionId) {
    const assoc = await prisma.asociacion.create({
      data: { nombre: 'Test Association' },
    });
    asociacionId = assoc.id;
  }

  const user = await prisma.usuario.create({
    data: {
      email: overrides.email || `test-${Date.now()}@example.com`,
      password,
      nombre: overrides.nombre || 'Test',
      apellido: overrides.apellido || 'User',
      dni: overrides.dni || `DNI-${Date.now()}`,
      fecha_nacimiento: new Date('1990-01-01'),
      genero: 'MASCULINO',
      rol: overrides.rol || 'BASICO',
      asociacion_id: asociacionId,
      estado_reg: overrides.estado_reg || 'APROBADO',
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
