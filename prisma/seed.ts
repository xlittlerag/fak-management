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

  // 1. Crear Asociaciones (Federación será ID 1)
  const asocFederacion = await prisma.asociacion.create({
    data: { nombre: 'Federación Argentina de Kendo' },
  });

  const asociacionYoshinkan = await prisma.asociacion.create({
    data: { nombre: 'Yoshinkan' },
  });

  const asociacionShinSenKai = await prisma.asociacion.create({
    data: { nombre: 'ShinSenKai' },
  });

  // 2. Crear Dojos
  const dojoCentral = await prisma.dojo.create({
    data: { nombre: 'Oficina Central', asociacion_id: asocFederacion.id },
  });

  const dojoMarDelPlata = await prisma.dojo.create({
    data: { nombre: 'Yoshinkan Mar del Plata', asociacion_id: asociacionYoshinkan.id },
  });

  const dojoKenYuKan = await prisma.dojo.create({
    data: { nombre: 'Ken Yu Kan', asociacion_id: asociacionShinSenKai.id },
  });

  const dojoMoron = await prisma.dojo.create({
    data: { nombre: 'Yoshinkan Moron', asociacion_id: asociacionYoshinkan.id },
  });

  const dojoLaPlata = await prisma.dojo.create({
    data: { nombre: 'Yoshinkan La Plata', asociacion_id: asociacionYoshinkan.id },
  });

  const dojoKaizen = await prisma.dojo.create({
    data: { nombre: 'Kaizen', asociacion_id: asociacionShinSenKai.id },
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
      dojoId: dojoCentral.id,
      gradKendo: 'DAN_7',
      gradIaido: 'DAN_5',
      gradJodo: 'DAN_3'
    },
    {
      email: 'matias@yoshinkan.com.ar',
      dni: '11111111',
      nombre: 'Matias',
      apellido: 'Lanfranconi',
      rol: 'ADMIN_ASOCIACION',
      asocId: asociacionYoshinkan.id,
      dojoId: dojoMarDelPlata.id,
      gradKendo: 'DAN_4',
      gradIaido: 'DAN_2',
      gradJodo: 'SIN_GRADUACION'
    },
    {
      email: 'juan@shinsenkai.com.ar',
      dni: '22222222',
      nombre: 'Juan',
      apellido: 'Grin',
      rol: 'ADMIN_ASOCIACION',
      asocId: asociacionShinSenKai.id,
      dojoId: dojoKenYuKan.id,
      gradKendo: 'DAN_2',
      gradIaido: 'KYU_1',
      gradJodo: 'KYU_2'
    },
    {
      email: 'santiago@shinsenkai.com.ar',
      dni: '33333333',
      nombre: 'Santiago',
      apellido: 'Farias',
      rol: 'ADMIN_ASOCIACION',
      asocId: asociacionShinSenKai.id,
      dojoId: dojoKaizen.id,
      gradKendo: 'SIN_GRADUACION',
      gradIaido: 'SIN_GRADUACION',
      gradJodo: 'SIN_GRADUACION'
    },
    {
      email: 'santiago@yoshinkan.com.ar',
      dni: '44444444',
      nombre: 'Santiago',
      apellido: 'Ojeda',
      rol: 'ADMIN_ASOCIACION',
      asocId: asociacionYoshinkan.id,
      dojoId: dojoLaPlata.id,
      gradKendo: 'SIN_GRADUACION',
      gradIaido: 'SIN_GRADUACION',
      gradJodo: 'SIN_GRADUACION'
    }
  ];

  for (const u of users) {
    await prisma.usuario.create({
      data: {
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
        grad_kendo: u.gradKendo as any,
        grad_iaido: u.gradIaido as any,
        grad_jodo: u.gradJodo as any,
      },
    });
  }

  console.log('✅ Base de datos sembrada correctamente.');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
