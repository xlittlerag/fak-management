import { PrismaClient, Rol, Graduacion } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const password = await bcrypt.hash('Admin123!', 10);

  // 0. Crear Admin General (Auth)
  await prisma.adminGeneral.upsert({
    where: { dni: '00000000' },
    update: { password },
    create: { dni: '00000000', password },
  });

  // 1. Limpiar datos existentes (orden inverso de FK)
  await prisma.precioExamen.deleteMany();
  await prisma.usuario.deleteMany({});
  await prisma.dojo.deleteMany({});
  await prisma.asociacion.deleteMany({});

  // 2. Crear Asociaciones
  const asociacionYoshinkan = await prisma.asociacion.create({
    data: { nombre: 'Yoshinkan' },
  });

  const asociacionShinSenKai = await prisma.asociacion.create({
    data: { nombre: 'ShinSenKai' },
  });

  // 3. Crear Dojos
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

  // 4. Crear Usuarios
  const users = [
    {
      email: 'matias@yoshinkan.com.ar',
      dni: '11111111',
      nombre: 'Matias',
      apellido: 'Lanfranconi',
      rol: 'ADMIN_ASOCIACION',
      asocId: asociacionYoshinkan.id,
      dojoId: dojoMarDelPlata.id,
      gradKendo: 'DAN_4',
      gradIaido: 'DAN_3',
      gradJodo: 'KYU_1'
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
      gradIaido: 'SIN_GRADUACION',
      gradJodo: 'SIN_GRADUACION'
    },
    {
      email: 'santiago@shinsenkai.com.ar',
      dni: '33333333',
      nombre: 'Santiago',
      apellido: 'Farias',
      rol: 'ADMIN_ASOCIACION',
      asocId: asociacionShinSenKai.id,
      dojoId: dojoKaizen.id,
      gradKendo: 'DAN_5',
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
      gradKendo: 'DAN_4',
      gradIaido: 'DAN_2',
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
        rol: u.rol as Rol,
        estado_reg: 'APROBADO',
        asociacion_id: u.asocId,
        dojo_id: u.dojoId,
        grad_kendo: u.gradKendo as Graduacion,
        grad_iaido: u.gradIaido as Graduacion,
        grad_jodo: u.gradJodo as Graduacion,
      },
    });
  }

  // 5. Crear precios de exámenes
  await prisma.precioExamen.createMany({
    data: [
      { graduacion: 'KYU_3', costo_inscripcion: 20000, costo_registro: 10000 },
      { graduacion: 'KYU_2', costo_inscripcion: 20000, costo_registro: 20000 },
      { graduacion: 'KYU_1', costo_inscripcion: 25000, costo_registro: 30000 },
      { graduacion: 'DAN_1', costo_inscripcion: 35000, costo_registro: 50000 },
      { graduacion: 'DAN_2', costo_inscripcion: 60000, costo_registro: 70000 },
      { graduacion: 'DAN_3', costo_inscripcion: 70000, costo_registro: 110000 },
      { graduacion: 'DAN_4', costo_inscripcion: 110000, costo_registro: 160000 },
    ],
  });

  console.log('✅ Base de datos sembrada correctamente.');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
