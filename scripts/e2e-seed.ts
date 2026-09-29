/**
 * Seed de la base aislada para los tests E2E de navegador (Playwright).
 *
 * Base: `e2e-test.db` en la raíz del repo. NUNCA toca `dev.db`.
 * Se ejecuta automáticamente desde `frontend/e2e/global-setup.ts`, por lo que
 * `pnpm --dir frontend e2e` es autosuficiente: hace `prisma db push`,
 * limpia las tablas dinámicas y siembra los fixtures base.
 *
 * Variables de entorno:
 *   E2E_DATABASE_URL — URL de la base E2E (defecto: file:./e2e-test.db,
 *                      relativa al cwd, que debe ser la raíz del repo).
 */
import { execSync } from 'node:child_process';
import { hash } from '@node-rs/argon2';
import { ARGON2_OPTIONS } from '../src/auth/password.service';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const DATABASE_URL = process.env.E2E_DATABASE_URL || 'file:./e2e-test.db';

export const E2E_ADMIN_PASSWORD = 'Admin123!';
export const E2E_USER_PASSWORD = 'Password123!';

export const E2E_BASICO_DNI = '11111111';
export const E2E_ASOC_DNI = '22222222';
export const E2E_DESAFILIADO_DNI = '33333333';

async function main() {
  execSync('npx prisma db push', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL },
  });

  const adapter = new PrismaBetterSqlite3({ url: DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  try {
    // Limpieza en orden inverso de FK (igual que test/test-utils.ts).
    await prisma.auditLog.deleteMany();
    await prisma.solicitudAfiliacion.deleteMany();
    await prisma.reimpresionDiploma.deleteMany();
    await prisma.diplomaNacional.deleteMany();
    await prisma.resultadoExamen.deleteMany();
    await prisma.registroExamen.deleteMany();
    await prisma.mesaExaminadora.deleteMany();
    await prisma.historialGraduacion.deleteMany();
    await prisma.inscripcionEvento.deleteMany();
    await prisma.certificadoExterno.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.dojo.deleteMany();
    await prisma.evento.deleteMany();
    await prisma.asociacion.deleteMany();
    await prisma.precioExamen.deleteMany();
    await prisma.cuotaGlobal.deleteMany();
    await prisma.configSistema.deleteMany();
    await prisma.dniBlacklist.deleteMany();

    const adminHash = await hash(E2E_ADMIN_PASSWORD, { ...ARGON2_OPTIONS });
    await prisma.adminGeneral.upsert({
      where: { dni: '00000000' },
      update: { password: adminHash },
      create: { dni: '00000000', password: adminHash },
    });

    const asociacion = await prisma.asociacion.create({
      data: { nombre: 'E2E Asociación' },
    });
    const dojo = await prisma.dojo.create({
      data: { nombre: 'E2E Dojo', asociacion_id: asociacion.id },
    });

    const userHash = await hash(E2E_USER_PASSWORD, { ...ARGON2_OPTIONS });
    const baseUser = {
      password: userHash,
      nombre: 'E2E',
      apellido: 'Usuario',
      fecha_nacimiento: new Date('1990-01-01'),
      sexo: 'MASCULINO' as const,
      calle_altura: 'Calle Falsa 123',
      ciudad: 'Ciudad E2E',
      provincia: 'BUENOS_AIRES' as const,
      codigo_postal: '1234',
      telefono: '1199999999',
      asociacion_id: asociacion.id,
      dojo_id: dojo.id,
    };

    await prisma.usuario.create({
      data: {
        ...baseUser,
        email: 'basico-e2e@example.com',
        dni: E2E_BASICO_DNI,
        rol: 'BASICO',
        estado_reg: 'APROBADO',
        estado_pago: true,
      },
    });
    await prisma.usuario.create({
      data: {
        ...baseUser,
        email: 'asoc-e2e@example.com',
        dni: E2E_ASOC_DNI,
        rol: 'ADMIN_ASOCIACION',
        estado_reg: 'APROBADO',
        estado_pago: true,
      },
    });
    await prisma.usuario.create({
      data: {
        ...baseUser,
        email: 'desafiliado-e2e@example.com',
        dni: E2E_DESAFILIADO_DNI,
        rol: 'BASICO',
        estado_reg: 'DESAFILIADO',
        estado_pago: false,
      },
    });

    await prisma.cuotaGlobal.create({
      data: {
        monto_actual: 15000.0,
        fecha_vencimiento: new Date(Date.now() + 30 * 86400000),
      },
    });

    console.log('✓ Seed E2E OK:', DATABASE_URL);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err) => {
  console.error('Error en seed E2E:', err);
  process.exit(1);
});
