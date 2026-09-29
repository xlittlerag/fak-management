import type { APIRequestContext, Playwright } from '@playwright/test';
import { API_URL, ADMIN_PASSWORD, USER_PASSWORD, uniqueDni, uniqueSuffix } from './env';

/** Contexto API autenticado como ADMIN_GENERAL (cookie httpOnly). */
export async function adminApi(pw: Playwright): Promise<APIRequestContext> {
  const ctx = await pw.request.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/auth/admin-login', {
    data: { password: ADMIN_PASSWORD },
  });
  if (!res.ok()) throw new Error(`admin-login falló: ${res.status()}`);
  return ctx;
}

/** Contexto API autenticado como usuario por DNI/clave. */
export async function userApi(
  pw: Playwright,
  dni: string,
  password = USER_PASSWORD,
): Promise<APIRequestContext> {
  const ctx = await pw.request.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/auth/login', { data: { dni, password } });
  if (!res.ok()) throw new Error(`login ${dni} falló: ${res.status()}`);
  return ctx;
}

/** Contexto API anónimo (para endpoints públicos como /asociaciones). */
export async function anonApi(pw: Playwright): Promise<APIRequestContext> {
  return pw.request.newContext({ baseURL: API_URL });
}

export interface SeedUser {
  dni: string;
  email: string;
  id: number;
}

/** Registra un usuario PENDIENTE_APROBACION con datos únicos. */
export async function registerUser(
  ctx: APIRequestContext,
  asociacionId: number,
  dojoId: number,
): Promise<SeedUser> {
  const suffix = uniqueSuffix();
  const dni = uniqueDni();
  const email = `e2e-${suffix}@example.com`;
  const res = await ctx.post('/api/auth/register', {
    data: {
      nombre: 'E2E',
      apellido: 'Auto',
      email,
      password: USER_PASSWORD,
      dni,
      fecha_nacimiento: '1995-05-15',
      sexo: 'MASCULINO',
      asociacion_id: asociacionId,
      dojo_id: dojoId,
      calle_altura: 'Av. E2E 123',
      ciudad: 'CABA',
      provincia: 'CABA',
      codigo_postal: '1000',
      telefono: '1199999999',
    },
  });
  if (!res.ok()) throw new Error(`register falló: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  return { dni, email, id: body.id };
}

/** Aprueba un usuario pendiente y retorna su id. */
export async function approveUser(admin: APIRequestContext, userId: number) {
  const res = await admin.patch(`/api/usuarios/${userId}/aprobacion`, {
    data: { accion: 'APROBAR' },
  });
  if (!res.ok()) throw new Error(`aprobacion falló: ${res.status()} ${await res.text()}`);
}

/** Crea y publica un SEMINARIO gratuito con dirección única. */
export async function createPublishedSeminario(
  admin: APIRequestContext,
): Promise<{ id: number; direccion: string }> {
  const direccion = `Dojo E2E ${uniqueSuffix()}`;
  const start = new Date(Date.now() + 30 * 86400000);
  const end = new Date(start.getTime() + 9 * 3600000);
  const created = await admin.post('/api/eventos', {
    data: {
      tipo: 'SEMINARIO',
      fecha_inicio: start.toISOString(),
      fecha_fin: end.toISOString(),
      datos_lugar: { direccion, provincia: 'CABA' },
      disciplina: 'KENDO',
      costo_inscripcion: 0,
    },
  });
  if (!created.ok()) throw new Error(`crear evento falló: ${created.status()} ${await created.text()}`);
  const evento = await created.json();
  const pub = await admin.patch(`/api/eventos/${evento.id}/publicar`);
  if (!pub.ok()) throw new Error(`publicar falló: ${pub.status()} ${await pub.text()}`);
  return { id: evento.id, direccion };
}

/** Paga la cuota federativa del usuario autenticado (modo simulado E2E). */
export async function pagarCuota(user: APIRequestContext) {
  const co = await user.post('/api/pagos/checkout-fee');
  if (!co.ok()) throw new Error(`checkout-fee falló: ${co.status()} ${await co.text()}`);
  const { externalReference } = await co.json();
  const sim = await user.post('/api/pagos/simulate', { data: { externalReference } });
  if (!sim.ok()) throw new Error(`simulate falló: ${sim.status()} ${await sim.text()}`);
}

/** Inscribe al usuario autenticado en el evento. Retorna el id de inscripción. */
export async function inscribir(user: APIRequestContext, eventoId: number): Promise<number> {
  const res = await user.post(`/api/eventos/${eventoId}/inscribir`, { data: {} });
  if (!res.ok()) throw new Error(`inscribir falló: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  return body.id;
}

/** Primera asociación y su primer dojo (el seed E2E garantiza que existen). */
export async function baseAsociacionDojo(ctx: APIRequestContext) {
  const asocs = await (await ctx.get('/api/asociaciones')).json();
  if (!asocs.length) throw new Error('Sin asociaciones en la base E2E');
  const asociacionId = asocs[0].id;
  const dojos = await (await ctx.get(`/api/dojos/asociacion/${asociacionId}`)).json();
  if (!dojos.length) throw new Error('Sin dojos en la base E2E');
  return { asociacionId, dojoId: dojos[0].id };
}
