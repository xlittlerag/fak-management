# Especificación Técnica - Iteración 5: Diplomas, Certificaciones y Reimpresión

> **Estado:** ✅ Implementado (commit `3a0ecf9`)

## 🎯 Objetivo

Implementar el módulo de gestión de diplomas y certificaciones externas, permitiendo:
- **Diplomas nacionales (FAK):** Carga por ADMIN_GENERAL (individual o por lote post-examen), vinculados a inscripciones de examen aprobadas.
- **Certificaciones externas:** Usuario sube diploma extranjero → aprobación en dos pasos (admin asociación → admin general) → actualización de graduación.
- **Reimpresión de diplomas:** Usuario solicita reimpresión de su último diploma nacional por disciplina, paga vía MercadoPago, ADMIN_GENERAL ve la solicitud con el PDF.

## 1. Modelos de Base de Datos

### `DiplomaNacional`

```prisma
model DiplomaNacional {
  id              Int                     @id @default(autoincrement())
  usuario_id      Int
  url_archivo     String                  // PDF subido a /files/upload
  disciplina      Disciplina
  graduacion      Graduacion              // Se obtiene de categoria_grad si viene de inscripción
  inscripcion_id  Int?                    // FK a InscripcionEvento (null para carga inicial desde Drive)
  created_at      DateTime                @default(now())
  usuario         Usuario                 @relation(fields: [usuario_id], references: [id])
  inscripcion     InscripcionEvento?      @relation(fields: [inscripcion_id], references: [id])
  reimpresiones   ReimpresionDiploma[]

  @@unique([inscripcion_id, disciplina])  // Evita duplicados por inscripción + disciplina
}
```

### `ReimpresionDiploma`

```prisma
model ReimpresionDiploma {
  id               Int        @id @default(autoincrement())
  usuario_id       Int
  diploma_id       Int
  pagado           Boolean    @default(false)
  mp_preference_id String?
  mp_payment_id    String?
  created_at       DateTime   @default(now())
  usuario          Usuario    @relation(fields: [usuario_id], references: [id])
  diploma          DiplomaNacional @relation(fields: [diploma_id], references: [id])
}
```

### `ConfigSistema`

```prisma
model ConfigSistema {
  id                 Int    @id @default(autoincrement())
  precio_reimpresion Float  @default(5000)
}
```

### Enums

```diff
 enum EstadoSolicitud {
   PENDIENTE
+  APROBADO_ASOCIACION   // Estado intermedio para certificaciones externas
   APROBADO
   RECHAZADO
 }
```

## 2. Endpoints

### 2.1 Certificaciones Externas (`CertificadosModule`)

| Método | Endpoint | Guard | Descripción |
|---|---|---|---|
| `POST` | `/certificados` | Autenticado | Crea `CertificadoExterno` con `{ url_archivo, disciplina, grad_solicitada }` → estado `PENDIENTE` |
| `GET` | `/certificados` | Autenticado | Usuario: sus propios certificados. Admin asociación: los de su asociación. ADMIN_GENERAL: todos |
| `PATCH` | `/certificados/:id/aprobar-asociacion` | `ADMIN_ASOCIACION` | Cambia estado a `APROBADO_ASOCIACION` |
| `PATCH` | `/certificados/:id/aprobar-general` | `ADMIN_GENERAL` | Cambia estado a `APROBADO`, actualiza `grad_*` del usuario, registra en `HistorialGraduacion` |
| `PATCH` | `/certificados/:id/rechazar` | `ADMIN_ASOCIACION`, `ADMIN_GENERAL` | Cambia estado a `RECHAZADO` |

### 2.2 Diplomas Nacionales (`DiplomasModule`)

| Método | Endpoint | Guard | Descripción |
|---|---|---|---|
| `POST` | `/admin/diplomas` | `ADMIN_GENERAL` | Individual. `{ url_archivo, usuario_id, disciplina, inscripcion_id? }`. Si `inscripcion_id` presente, valida `estado_aprob === APROBADO` y obtiene graduación de `categoria_grad` |
| `POST` | `/admin/diplomas/lote` | `ADMIN_GENERAL` | Array del mismo formato. Rechaza todo si algún ítem falla (duplicado, inscripción no APROBADA) |
| `GET` | `/admin/diplomas?usuario_id=X` | `ADMIN_GENERAL` | Lista con usuario, disciplina, graduación, fecha, evento vinculado |
| `GET` | `/admin/diploma/config` | `ADMIN_GENERAL` | `{ precio_reimpresion }` |
| `PATCH` | `/admin/diploma/config` | `ADMIN_GENERAL` | Actualiza `precio_reimpresion` |
| `GET` | `/admin/diploma/reimpresiones` | `ADMIN_GENERAL` | Lista solicitudes con usuario, disciplina, graduación, link PDF, pagado, fecha |
| `GET` | `/mis-diplomas` | Autenticado | Diplomas nacionales del usuario (disciplina, graduación, fecha) |
| `POST` | `/diplomas/reimprimir` | Autenticado | `{ disciplina }` → busca el `DiplomaNacional` más reciente → crea `ReimpresionDiploma` + preferencia MP |

### 2.3 Endpoints existentes modificados

**`GET /eventos/:id/inscripciones`** — nuevo query param `?aprobados=true`:
- Filtra solo `estado_aprob === APROBADO`
- Incluye `categoria_grad` parseado por disciplina

**`POST /pagos/webhook`** — nuevo prefijo `reimpresion_`:
- Formato: `reimpresion_user_<userId>_reimp_<reimpresionId>_ts_<timestamp>`
- Si `status === 'approved'`, marca `pagado = true` en `ReimpresionDiploma`

## 3. Reglas de Negocio

### Diplomas Nacionales
- Solo ADMIN_GENERAL puede cargar diplomas nacionales.
- Cada diploma nacional se vincula opcionalmente a una `InscripcionEvento` + `disciplina`.
- `@@unique([inscripcion_id, disciplina])` impide cargar dos diplomas para la misma disciplina de un mismo examen.
- Si `inscripcion_id` está presente, la `graduacion` se obtiene automáticamente de `InscripcionEvento.categoria_grad`.
- Si `inscripcion_id` es null (carga inicial desde Drive), el admin especifica la graduación manualmente.

### Certificaciones Externas
- El usuario sube el archivo (PDF de su diploma extranjero).
- El admin de su asociación aprueba primero → `APROBADO_ASOCIACION`.
- El admin general aprueba después → se actualiza `grad_*` y se registra en `HistorialGraduacion`.
- Cualquier admin puede rechazar en cualquier paso.

### Reimpresión
- El usuario elige una disciplina → el backend busca el `DiplomaNacional` más reciente de esa disciplina.
- Solo diplomas nacionales (FAK) pueden reimprimirse.
- Se crea `ReimpresionDiploma` con `pagado = false` y se genera preferencia de MP.
- Cuando el webhook confirma el pago, `pagado = true`.
- ADMIN_GENERAL puede ver todas las solicitudes de reimpresión con el PDF original vinculado.
- El precio es global (`ConfigSistema.precio_reimpresion`), configurable por ADMIN_GENERAL.

## 4. Frontend

### 4.1 Nuevas vistas

#### `Certificados.tsx` (BASICO)
- Tabla de certificaciones externas propias (disciplina, graduación solicitada, estado, fecha)
- Formulario: select disciplina + select graduación + upload PDF → envía a `POST /certificados`
- Muestra estado del trámite (PENDIENTE → APROBADO_ASOCIACION → APROBADO / RECHAZADO)

#### `CertificadosPendientesAdmin.tsx` (ADMIN_ASOCIACION, ADMIN_GENERAL)
- Tabla de certificaciones en PENDIENTE
- Columnas: usuario, disciplina, graduación, link al PDF, fecha
- ADMIN_ASOCIACION: botones Aprobar / Rechazar
- ADMIN_GENERAL: además, botón "Aprobar definitivamente" para los que están en APROBADO_ASOCIACION
- Filtro por asociación (automático para admin de asociación)

#### `DiplomasAdmin.tsx` (ADMIN_GENERAL)
Tres secciones:

1. **Cargar diplomas**
   - **Individual:** buscador de usuario + select disciplina + select graduación (si no hay inscripción) + upload PDF
   - **Lote (post-examen):** select evento → carga inscripciones aprobadas → tabla con filas (usuario, disciplina, graduación, upload PDF) → botón "Cargar todos (N)"

2. **Reimpresiones solicitadas**
   - Tabla: usuario, disciplina, graduación, link PDF original, pagado, fecha
   - Filtro por estado de pago

3. **Configuración**
   - Input numérico `precio_reimpresion` + botón guardar

### 4.2 Vistas modificadas

#### `Perfil.tsx`
- En la sección de graduaciones, si el usuario tiene `DiplomaNacional` en al menos una disciplina, botón "Solicitar reimpresión"
- Modal: select disciplina + texto informativo ("Se reimprimirá el último diploma de {disciplina}") + confirmar → checkout MP

#### `Dashboard.tsx` (sidebar)
```diff
+{ label: 'Mis Certificados',            path: '/dashboard/certificados',            roles: ['BASICO'] },
+{ label: 'Certificados Pendientes',     path: '/dashboard/certificados-pendientes', roles: ['ADMIN_ASOCIACION', 'ADMIN_GENERAL'] },
+{ label: 'Diplomas',                    path: '/dashboard/diplomas-admin',          roles: ['ADMIN_GENERAL'] },
```

## 5. Integración con Mercado Pago

Para reimpresiones, el `external_reference` sigue el formato:
```
reimpresion_user_<userId>_reimp_<reimpresionId>_ts_<timestamp>
```

El webhook existente `POST /pagos/webhook` se extiende para parsear este prefijo y, si `status === 'approved'`, marcar `ReimpresionDiploma.pagado = true`.

## 6. Archivos del módulo

### Backend

| Archivo | Descripción |
|---|---|
| `prisma/schema.prisma` | Modificar: agregar modelos y enum |
| `src/certificados/certificados.module.ts` | Nuevo módulo |
| `src/certificados/certificados.controller.ts` | Controlador de certificaciones externas |
| `src/certificados/certificados.service.ts` | Servicio de certificaciones externas |
| `src/certificados/dto/create-certificado.dto.ts` | DTO para crear certificación |
| `src/diplomas/diplomas.module.ts` | Nuevo módulo |
| `src/diplomas/diplomas.controller.ts` | Controlador de diplomas nacionales |
| `src/diplomas/diplomas.service.ts` | Servicio de diplomas nacionales |
| `src/diplomas/dto/create-diploma.dto.ts` | DTO para crear diploma (individual y lote) |
| `src/diplomas/dto/reimprimir.dto.ts` | DTO para solicitar reimpresión |
| `src/diplomas/dto/config-diploma.dto.ts` | DTO para configurar precio |
| `src/diplomas/dto/update-config.dto.ts` | DTO para actualizar precio |
| `src/app.module.ts` | Registrar `CertificadosModule` y `DiplomasModule` |
| `src/eventos/eventos.controller.ts` | Modificar: agregar query param `?aprobados=true` |
| `src/eventos/eventos.service.ts` | Modificar: filtrar inscripciones aprobadas |
| `src/pagos/pagos.service.ts` | Modificar: procesar reimpresiones en webhook |

### Frontend

| Archivo | Descripción |
|---|---|
| `frontend/src/routes/Certificados.tsx` | Nueva vista de certificaciones del usuario |
| `frontend/src/routes/CertificadosPendientesAdmin.tsx` | Nueva vista de aprobación de certificaciones |
| `frontend/src/routes/DiplomasAdmin.tsx` | Nueva vista de gestión de diplomas |
| `frontend/src/routes/Perfil.tsx` | Modificar: botón de reimpresión |
| `frontend/src/routes/Dashboard.tsx` | Modificar: sidebar + routing |

### Tests

| Archivo | Descripción |
|---|---|
| `test/certificados.e2e-spec.ts` | Tests de certificaciones externas |
| `test/diplomas.e2e-spec.ts` | Tests de diplomas nacionales + reimpresión |

## 7. Criterios de Aceptación (DoD)

- [x] ADMIN_GENERAL puede cargar diplomas nacionales individualmente (con o sin inscripción vinculada).
- [x] ADMIN_GENERAL puede cargar diplomas nacionales por lote desde un evento.
- [x] No se permiten diplomas duplicados para la misma inscripción + disciplina.
- [x] Usuario puede subir certificaciones externas.
- [x] Admin de asociación puede aprobar/rechazar certificaciones externas de su asociación.
- [x] ADMIN_GENERAL puede aprobar definitivamente una certificación externa (actualiza graduación).
- [x] Usuario puede ver sus propios diplomas nacionales.
- [x] Usuario puede solicitar reimpresión de su último diploma nacional por disciplina.
- [x] ADMIN_GENERAL puede configurar el precio de reimpresión.
- [x] ADMIN_GENERAL puede ver solicitudes de reimpresión con datos del usuario y PDF original.
- [x] El webhook de Mercado Pago procesa pagos de reimpresión correctamente.
- [x] Mensajes de error en español formal (Usted).
- [x] 21 tests E2E nuevos (129 total, todos pasan).
