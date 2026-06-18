import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const password = await bcrypt.hash('Admin123!', 10);

  // 1. Crear Asociaciones
  const asocFederacion = await prisma.asociacion.upsert({
    where: { id: 0 },
    update: {},
    create: { id: 0, nombre: 'Federación Argentina de Kendo' },
  });

  const asociacionYoshinkan = await prisma.asociacion.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nombre: 'Yoshinkan' },
  });

  const asociacionShinSenKai = await prisma.asociacion.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, nombre: 'ShinSenKai' },
  });

  // 2. Crear Dojos
  const dojoCentral = await prisma.dojo.upsert({
    where: { id: 0 },
    update: {},
    create: { id: 0, nombre: 'Oficina Central', asociacion_id: asocFederacion.id },
  });

  const dojoMarDelPlata = await prisma.dojo.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nombre: 'Yoshinkan Mar del Plata', asociacion_id: asociacionYoshinkan.id },
  });

  const dojoKenYuKan = await prisma.dojo.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, nombre: 'Ken Yu Kan', asociacion_id: asociacionShinSenKai.id },
  });

  // 3. Crear Usuarios
  const users = [
    {
      email: 'admin@kendo.com',
      dni: '00000000',
      nombre: 'Admin',
      apellido: 'General',
      rol: 'ADMIN_GENERAL',
      asocId: asocFederacion.id,
      dojoId: dojoCentral.id
    },
    {
      email: 'matias@yoshinkan.com.ar',
      dni: '11111111',
      nombre: 'Matias',
      apellido: 'Lanfranconi',
      rol: 'ADMIN_ASOCIACION',
      asocId: asociacionYoshinkan.id,
      dojoId: dojoMarDelPlata.id
    },
    {
      email: 'juan@shinsenkai.com.ar',
      dni: '22222222',
      nombre: 'Juan',
      apellido: 'Grin',
      rol: 'ADMIN_ASOCIACION',
      asocId: asociacionShinSenKai.id,
      dojoId: dojoKenYuKan.id
    }
  ];

  for (const u of users) {
    await prisma.usuario.upsert({
      where: { dni: u.dni },
      update: {},
      create: {
        email: u.email,
        dni: u.dni,
        password,
        nombre: u.nombre,
        apellido: u.apellido,
        fecha_nacimiento: new Date('1990-01-01'),
        sexo: 'MASCULINO',
        calle_altura: 'Calle Falsa 123',
        ciudad: 'Ciudad Test',
        provincia: 'BUENOS_AIRES',
        codigo_postal: '1000',
        rol: u.rol as any,
        estado_reg: 'APROBADO',
        asociacion_id: u.asocId,
        dojo_id: u.dojoId,
      },
    });
  }

  console.log('✅ Base de datos sembrada correctamente con Dojos y Oficina Central.');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
