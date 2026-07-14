import { PrismaClient, Rol, Graduacion, Disciplina, EstadoSolicitud } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

function months(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d;
}

function days(n: number, from?: Date): Date {
  const d = from ? new Date(from) : new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || 'file:./dev.db',
  });
  const prisma = new PrismaClient({ adapter });

  const pwd = await bcrypt.hash('Test1234!', 10);
  const adminPwd = await bcrypt.hash('Admin123!', 10);

  // 0. Admin General (login via POST /auth/admin-login with password)
  await prisma.adminGeneral.upsert({
    where: { dni: '00000000' },
    update: { password: adminPwd },
    create: { dni: '00000000', password: adminPwd },
  });

  // 1. Cleanup
  await prisma.auditLog.deleteMany();
  await prisma.reimpresionDiploma.deleteMany();
  await prisma.diplomaNacional.deleteMany();
  await prisma.historialGraduacion.deleteMany();
  await prisma.certificadoExterno.deleteMany();
  await prisma.inscripcionEvento.deleteMany();
  await prisma.examen.deleteMany();
  await prisma.torneo.deleteMany();
  await prisma.seminario.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.precioExamen.deleteMany();
  await prisma.cuotaGlobal.deleteMany();
  await prisma.configSistema.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.dojo.deleteMany();
  await prisma.asociacion.deleteMany();

  // 2. Asociaciones
  const yoshinkan = await prisma.asociacion.create({ data: { nombre: 'Yoshinkan' } });
  const shinsen = await prisma.asociacion.create({ data: { nombre: 'ShinSenKai' } });
  const federacion = await prisma.asociacion.create({ data: { nombre: 'Federación Argentina de Kendo' } });

  // 3. Dojos
  const dojoMdp = await prisma.dojo.create({ data: { nombre: 'Yoshinkan Mar del Plata', asociacion_id: yoshinkan.id } });
  const dojoMoron = await prisma.dojo.create({ data: { nombre: 'Yoshinkan Morón', asociacion_id: yoshinkan.id } });
  const dojoLaPlata = await prisma.dojo.create({ data: { nombre: 'Yoshinkan La Plata', asociacion_id: yoshinkan.id } });
  const dojoKenYuKan = await prisma.dojo.create({ data: { nombre: 'Ken Yu Kan', asociacion_id: shinsen.id } });
  const dojoKaizen = await prisma.dojo.create({ data: { nombre: 'Kaizen', asociacion_id: shinsen.id } });

  // 4. Usuarios
  interface UserSeed {
    email: string; dni: string; nombre: string; apellido: string;
    rol: Rol; asocId: number; dojoId: number;
    gradKendo?: Graduacion; gradIaido?: Graduacion; gradJodo?: Graduacion;
    estadoReg?: string; estadoPago?: boolean;
  }

  const userSeeds: UserSeed[] = [
    // --- ADMIN_ASOCIACION ---
    { email: 'matias@yoshinkan.com.ar', dni: '11111111', nombre: 'Matías', apellido: 'Lanfranconi', rol: 'ADMIN_ASOCIACION', asocId: yoshinkan.id, dojoId: dojoMdp.id, gradKendo: 'DAN_4', gradIaido: 'DAN_3', gradJodo: 'KYU_1' },
    { email: 'santiago@yoshinkan.com.ar', dni: '22222222', nombre: 'Santiago', apellido: 'Ojeda', rol: 'ADMIN_ASOCIACION', asocId: yoshinkan.id, dojoId: dojoLaPlata.id, gradKendo: 'DAN_4', gradIaido: 'DAN_2' },
    { email: 'juan@shinsenkai.com.ar', dni: '33333333', nombre: 'Juan', apellido: 'Grin', rol: 'ADMIN_ASOCIACION', asocId: shinsen.id, dojoId: dojoKenYuKan.id, gradKendo: 'DAN_2' },
    { email: 'santiago@shinsenkai.com.ar', dni: '44444444', nombre: 'Santiago', apellido: 'Farías', rol: 'ADMIN_ASOCIACION', asocId: shinsen.id, dojoId: dojoKaizen.id, gradKendo: 'DAN_5' },
    // --- BASICO (Yoshinkan) ---
    { email: 'maria@test.com', dni: '55555555', nombre: 'María', apellido: 'García', rol: 'BASICO', asocId: yoshinkan.id, dojoId: dojoMdp.id, gradKendo: 'DAN_1', gradIaido: 'KYU_2' },
    { email: 'carlos@test.com', dni: '66666666', nombre: 'Carlos', apellido: 'Pérez', rol: 'BASICO', asocId: yoshinkan.id, dojoId: dojoMdp.id },
    { email: 'lucia@test.com', dni: '77777777', nombre: 'Lucía', apellido: 'Martínez', rol: 'BASICO', asocId: yoshinkan.id, dojoId: dojoLaPlata.id, gradKendo: 'KYU_3', gradIaido: 'KYU_3' },
    { email: 'diego@test.com', dni: '88888888', nombre: 'Diego', apellido: 'Rodríguez', rol: 'BASICO', asocId: yoshinkan.id, dojoId: dojoMoron.id, gradKendo: 'DAN_2', gradJodo: 'DAN_2' },
    { email: 'sofia@test.com', dni: '99999999', nombre: 'Sofía', apellido: 'López', rol: 'BASICO', asocId: yoshinkan.id, dojoId: dojoMdp.id, gradKendo: 'KYU_1', estadoReg: 'PENDIENTE_APROBACION' },
    // --- BASICO (ShinSenKai) ---
    { email: 'pedro@test.com', dni: '10101010', nombre: 'Pedro', apellido: 'Sánchez', rol: 'BASICO', asocId: shinsen.id, dojoId: dojoKenYuKan.id, gradKendo: 'DAN_3', gradIaido: 'DAN_1' },
    { email: 'ana@test.com', dni: '11111112', nombre: 'Ana', apellido: 'Fernández', rol: 'BASICO', asocId: shinsen.id, dojoId: dojoKaizen.id, gradKendo: 'KYU_2', gradJodo: 'KYU_3' },
    { email: 'jorge@test.com', dni: '12121212', nombre: 'Jorge', apellido: 'Díaz', rol: 'BASICO', asocId: shinsen.id, dojoId: dojoKenYuKan.id, estadoReg: 'PENDIENTE_APROBACION' },
    { email: 'laura@test.com', dni: '13131313', nombre: 'Laura', apellido: 'Torres', rol: 'BASICO', asocId: shinsen.id, dojoId: dojoKaizen.id, gradKendo: 'KYU_1', gradIaido: 'KYU_1' },
    { email: 'martin@test.com', dni: '14141414', nombre: 'Martín', apellido: 'Ruiz', rol: 'BASICO', asocId: shinsen.id, dojoId: dojoKenYuKan.id, gradKendo: 'DAN_1' },
  ];

  const createdUsers: { id: number; email: string; dni: string; rol: Rol; asociacion_id: number }[] = [];

  for (const u of userSeeds) {
    const user = await prisma.usuario.create({
      data: {
        email: u.email, dni: u.dni, password: pwd,
        nombre: u.nombre, apellido: u.apellido,
        fecha_nacimiento: new Date('1990-01-01'), sexo: u.nombre.endsWith('a') ? 'FEMENINO' : 'MASCULINO',
        calle_altura: 'Calle Falsa 123', ciudad: 'Ciudad Test', provincia: 'BUENOS_AIRES', codigo_postal: '1000',
        rol: u.rol, asociacion_id: u.asocId, dojo_id: u.dojoId,
        estado_reg: (u.estadoReg ?? 'APROBADO') as any,
        estado_pago: u.estadoPago ?? false,
        grad_kendo: u.gradKendo ?? 'SIN_GRADUACION' as Graduacion,
        grad_iaido: u.gradIaido ?? 'SIN_GRADUACION' as Graduacion,
        grad_jodo: u.gradJodo ?? 'SIN_GRADUACION' as Graduacion,
      },
    });
    createdUsers.push({ id: user.id, email: user.email, dni: user.dni, rol: user.rol, asociacion_id: user.asociacion_id });
  }

  // Convenience lookups
  const user = (email: string) => createdUsers.find(u => u.email === email)!;
  const yoshinkanIds = createdUsers.filter(u => u.asociacion_id === yoshinkan.id).map(u => u.id);
  const shinsenIds = createdUsers.filter(u => u.asociacion_id === shinsen.id).map(u => u.id);

  // 5. Eventos
  interface EventoSeed {
    tipo: string; titulo: string; fechaInicio: Date; fechaFin: Date;
    publicado: boolean; creador: number;
    ambito?: string; pagoFueraSistema?: boolean;
    // tipo-specific
    costo?: number; categorias?: any[]; inscripcionMultiple?: boolean;
    disciplinas?: string[]; gradRangos?: any[];
    infoAdicional?: string;
  }

  const eventosSeed: EventoSeed[] = [
    {
      tipo: 'TORNEO', titulo: 'Torneo Nacional de Kendo 2026',
      fechaInicio: months(-3), fechaFin: days(2, months(-3)),
      publicado: true, creador: user('matias@yoshinkan.com.ar').id,
      ambito: 'NACIONAL', costo: 5000,
      categorias: [{ nombre: 'Masculino Mayores' }, { nombre: 'Femenino Mayores' }, { nombre: 'Juvenil' }],
      inscripcionMultiple: false, infoAdicional: 'Torneo anual clasificatorio.',
    },
    {
      tipo: 'EXAMEN', titulo: 'Examen de Grados Julio 2026',
      fechaInicio: months(-2), fechaFin: days(1, months(-2)),
      publicado: true, creador: user('santiago@yoshinkan.com.ar').id,
      ambito: 'NACIONAL', disciplinas: ['KENDO', 'IAIDO'],
      gradRangos: [
        { disciplina: 'KENDO', grad_min: 'KYU_3', grad_max: 'DAN_8' },
        { disciplina: 'IAIDO', grad_min: 'KYU_3', grad_max: 'DAN_5' },
      ],
    },
    {
      tipo: 'TORNEO', titulo: 'Torneo Regional Buenos Aires',
      fechaInicio: months(1), fechaFin: days(2, months(1)),
      publicado: true, creador: user('matias@yoshinkan.com.ar').id,
      ambito: 'REGIONAL', costo: 3000,
      categorias: [{ nombre: 'Masculino' }, { nombre: 'Femenino' }],
      inscripcionMultiple: true,
    },
    {
      tipo: 'TORNEO', titulo: 'Copa Federación',
      fechaInicio: months(2), fechaFin: days(2, months(2)),
      publicado: false, creador: user('juan@shinsenkai.com.ar').id,
      ambito: 'NACIONAL', costo: 7000,
      categorias: [{ nombre: 'Masculino Mayores' }, { nombre: 'Femenino Mayores' }, { nombre: 'Juvenil' }, { nombre: 'Veteranos' }],
      inscripcionMultiple: false,
    },
    {
      tipo: 'EXAMEN', titulo: 'Examen de Grados Diciembre 2026',
      fechaInicio: months(3), fechaFin: days(1, months(3)),
      publicado: true, creador: user('santiago@shinsenkai.com.ar').id,
      ambito: 'NACIONAL', disciplinas: ['KENDO', 'IAIDO', 'JODO'],
      gradRangos: [
        { disciplina: 'KENDO', grad_min: 'KYU_3', grad_max: 'DAN_8' },
        { disciplina: 'IAIDO', grad_min: 'KYU_3', grad_max: 'DAN_5' },
        { disciplina: 'JODO', grad_min: 'KYU_3', grad_max: 'DAN_5' },
      ],
      pagoFueraSistema: true,
    },
    {
      tipo: 'SEMINARIO', titulo: 'Seminario de Kendo Shinsa Shidoin',
      fechaInicio: days(7), fechaFin: days(9),
      publicado: true, creador: user('matias@yoshinkan.com.ar').id,
      ambito: 'NACIONAL', costo: 10000,
      disciplinas: ['KENDO'], infoAdicional: 'Seminario intensivo para instructores.',
    },
  ];

  interface CreatedEvento {
    id: number; tipo: string; titulo: string;
  }
  const createdEventos: CreatedEvento[] = [];

  for (const ev of eventosSeed) {
    const evento = await prisma.evento.create({
      data: {
        tipo: ev.tipo, fecha_inicio: ev.fechaInicio, fecha_fin: ev.fechaFin,
        datos_lugar: { direccion: 'Av. Principal 123', provincia: 'CABA' },
        publicado: ev.publicado, ambito: ev.ambito ?? 'REGIONAL',
        creador_id: ev.creador, pago_fuera_sistema: ev.pagoFueraSistema ?? false,
      },
    });
    createdEventos.push({ id: evento.id, tipo: ev.tipo, titulo: ev.titulo });

    if (ev.tipo === 'TORNEO') {
      await prisma.torneo.create({
        data: {
          evento_id: evento.id, disciplina: 'KENDO',
          costo_inscripcion: ev.costo ?? 0, categorias: ev.categorias ?? [],
          inscripcion_multiple: ev.inscripcionMultiple ?? false,
          info_adicional: ev.infoAdicional ?? null,
        },
      });
    } else if (ev.tipo === 'EXAMEN') {
      await prisma.examen.create({
        data: {
          evento_id: evento.id, disciplinas: ev.disciplinas ?? [],
          graduaciones_a_rendir: ev.gradRangos ?? [],
          info_adicional: ev.infoAdicional ?? null,
        },
      });
    } else if (ev.tipo === 'SEMINARIO') {
      await prisma.seminario.create({
        data: {
          evento_id: evento.id, disciplina: (ev.disciplinas ?? ['KENDO'])[0],
          costo_inscripcion: ev.costo ?? 0, info_adicional: ev.infoAdicional ?? null,
        },
      });
    }
  }

  const torneoNac = createdEventos.find(e => e.tipo === 'TORNEO' && e.titulo.includes('Nacional'))!;
  const examenJulio = createdEventos.find(e => e.tipo === 'EXAMEN' && e.titulo.includes('Julio'))!;
  const torneoRegional = createdEventos.find(e => e.tipo === 'TORNEO' && e.titulo.includes('Regional'))!;
  const examenDic = createdEventos.find(e => e.tipo === 'EXAMEN' && e.titulo.includes('Diciembre'))!;
  const seminario = createdEventos.find(e => e.tipo === 'SEMINARIO')!;

  // 6. Inscripciones
  function makeInscripcion(eventoId: number, usuarioId: number, opts?: {
    categorias?: string[]; disciplinas?: string[];
    estado?: string; pagado?: boolean; grad_cat?: any;
    necesidades?: boolean; descNecesidades?: string;
    pagoFueraSistema?: boolean;
  }) {
    return prisma.inscripcionEvento.create({
      data: {
        usuario_id: usuarioId, evento_id: eventoId,
        categoria_grad: opts?.grad_cat ?? opts?.categorias ?? [],
        disciplinas: opts?.disciplinas ?? undefined,
        estado_aprob: (opts?.estado ?? 'PENDIENTE') as EstadoSolicitud,
        pagado: opts?.pagado ?? false, pagado_fuera_sistema: opts?.pagoFueraSistema ?? false,
        necesidades_especiales: opts?.necesidades ?? false,
        descripcion_necesidades: opts?.descNecesidades ?? null,
        archivo_medico_url: opts?.necesidades ? '/uploads/seed/certificado-medico.pdf' : null,
      },
    });
  }

  // Torneo Nacional pasado — algunas inscripciones
  await makeInscripcion(torneoNac.id, user('maria@test.com').id,
    { categorias: ['Femenino Mayores'], estado: 'APROBADO', pagado: true });
  await makeInscripcion(torneoNac.id, user('diego@test.com').id,
    { categorias: ['Masculino Mayores'], estado: 'APROBADO', pagado: true });
  await makeInscripcion(torneoNac.id, user('pedro@test.com').id,
    { categorias: ['Masculino Mayores'], estado: 'APROBADO', pagado: false });
  await makeInscripcion(torneoNac.id, user('lucia@test.com').id,
    { categorias: ['Femenino Mayores'], estado: 'PENDIENTE', pagado: false });
  await makeInscripcion(torneoNac.id, user('carlos@test.com').id,
    { categorias: ['Masculino Mayores'], estado: 'RECHAZADO', pagado: false });

  // Examen Julio pasado — inscripciones aprobadas con graduaciones para diplomas
  const insExamen1 = await makeInscripcion(examenJulio.id, user('maria@test.com').id,
    { disciplinas: ['KENDO', 'IAIDO'], estado: 'APROBADO', pagado: true,
      grad_cat: { KENDO: 'DAN_2', IAIDO: 'KYU_3' } });
  const insExamen2 = await makeInscripcion(examenJulio.id, user('diego@test.com').id,
    { disciplinas: ['KENDO'], estado: 'APROBADO', pagado: true,
      grad_cat: { KENDO: 'DAN_3' } });
  const insExamen3 = await makeInscripcion(examenJulio.id, user('laura@test.com').id,
    { disciplinas: ['KENDO', 'IAIDO'], estado: 'APROBADO', pagado: true,
      grad_cat: { KENDO: 'DAN_1', IAIDO: 'KYU_2' } });
  await makeInscripcion(examenJulio.id, user('ana@test.com').id,
    { disciplinas: ['KENDO'], estado: 'PENDIENTE', pagado: false,
      necesidades: true, descNecesidades: 'Dificultad visual parcial.' });

  // Torneo Regional futuro — algunas pre-inscripciones
  await makeInscripcion(torneoRegional.id, user('maria@test.com').id,
    { categorias: ['Femenino'], estado: 'APROBADO', pagado: true });
  await makeInscripcion(torneoRegional.id, user('carlos@test.com').id,
    { categorias: ['Masculino'], estado: 'PENDIENTE', pagado: false });

  // Examen Diciembre futuro — algunas pre-inscripciones
  await makeInscripcion(examenDic.id, user('pedro@test.com').id,
    { disciplinas: ['KENDO'], estado: 'APROBADO', pagado: true });
  await makeInscripcion(examenDic.id, user('martin@test.com').id,
    { disciplinas: ['KENDO'], estado: 'PENDIENTE', pagado: false });

  // Seminario
  await makeInscripcion(seminario.id, user('lucia@test.com').id,
    { estado: 'APROBADO', pagado: true });
  await makeInscripcion(seminario.id, user('laura@test.com').id,
    { estado: 'PENDIENTE', pagado: false });

  // 7. Diplomas
  const diplomas = [
    { usuario: user('maria@test.com').id, disciplina: 'KENDO' as Disciplina, graduacion: 'DAN_2' as Graduacion, inscripcion: insExamen1.id },
    { usuario: user('maria@test.com').id, disciplina: 'IAIDO' as Disciplina, graduacion: 'KYU_3' as Graduacion, inscripcion: insExamen1.id },
    { usuario: user('diego@test.com').id, disciplina: 'KENDO' as Disciplina, graduacion: 'DAN_3' as Graduacion, inscripcion: insExamen2.id },
    { usuario: user('laura@test.com').id, disciplina: 'KENDO' as Disciplina, graduacion: 'DAN_1' as Graduacion, inscripcion: insExamen3.id },
    { usuario: user('laura@test.com').id, disciplina: 'IAIDO' as Disciplina, graduacion: 'KYU_2' as Graduacion, inscripcion: insExamen3.id },
    { usuario: user('pedro@test.com').id, disciplina: 'KENDO' as Disciplina, graduacion: 'DAN_3' as Graduacion }, // manual
    { usuario: user('diego@test.com').id, disciplina: 'JODO' as Disciplina, graduacion: 'DAN_2' as Graduacion }, // manual
  ];

  for (const d of diplomas) {
    await prisma.diplomaNacional.create({
      data: {
        usuario_id: d.usuario, url_archivo: '/uploads/seed/diploma.pdf',
        disciplina: d.disciplina, graduacion: d.graduacion,
        inscripcion_id: d.inscripcion ?? null,
      },
    });
  }

  // 8. Certificaciones externas
  await prisma.certificadoExterno.create({
    data: { usuario_id: user('maria@test.com').id, url_archivo: '/uploads/seed/ext.pdf', disciplina: 'KENDO', grad_solicitada: 'DAN_3', estado: 'PENDIENTE' },
  });
  await prisma.certificadoExterno.create({
    data: { usuario_id: user('carlos@test.com').id, url_archivo: '/uploads/seed/ext.pdf', disciplina: 'KENDO', grad_solicitada: 'KYU_1', estado: 'APROBADO_ASOCIACION' },
  });
  await prisma.certificadoExterno.create({
    data: { usuario_id: user('ana@test.com').id, url_archivo: '/uploads/seed/ext.pdf', disciplina: 'IAIDO', grad_solicitada: 'KYU_2', estado: 'APROBADO' },
  });
  await prisma.certificadoExterno.create({
    data: { usuario_id: user('martin@test.com').id, url_archivo: '/uploads/seed/ext.pdf', disciplina: 'KENDO', grad_solicitada: 'DAN_2', estado: 'RECHAZADO' },
  });

  // 9. Historial de graduaciones
  await prisma.historialGraduacion.create({
    data: { usuario_id: user('maria@test.com').id, disciplina: 'KENDO', graduacion: 'DAN_1', fecha_obtencion: months(-24), otorgado_por: 'Examen FAK 2024' },
  });
  await prisma.historialGraduacion.create({
    data: { usuario_id: user('diego@test.com').id, disciplina: 'KENDO', graduacion: 'DAN_1', fecha_obtencion: months(-36), otorgado_por: 'Examen FAK 2023' },
  });
  await prisma.historialGraduacion.create({
    data: { usuario_id: user('diego@test.com').id, disciplina: 'JODO', graduacion: 'DAN_1', fecha_obtencion: months(-12), otorgado_por: 'Examen FAK 2025' },
  });

  // 10. Precios de exámenes
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

  // 11. Cuota federativa
  await prisma.cuotaGlobal.create({
    data: { monto_actual: 15000, fecha_vencimiento: months(1) },
  });

  // 12. Config del sistema
  await prisma.configSistema.create({
    data: { precio_reimpresion: 5000 },
  });

  console.log('✅ Base de datos sembrada correctamente.');
  const userCount = createdUsers.length;
  const eventoCount = createdEventos.length;
  const eventoTypes = eventosSeed.map(e => e.tipo).join(', ');
  console.log(`   ${userCount} usuarios, ${eventoCount} eventos (${eventoTypes}), diplomas, certificaciones y más.`);
  console.log(`   Admin login: POST /auth/admin-login { password: "Admin123!" }`);
  console.log(`   User login:  POST /auth/login { dni: "11111111", password: "Test1234!" }`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
