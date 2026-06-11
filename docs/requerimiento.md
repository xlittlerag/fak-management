# Requerimiento: Kendo Manager

## Descripción

Kendo Manager es una aplicación web para llevar el registro de los practicantes
de la **Federación Argentina de Kendo (FAK)**. Permite la gestión de
practicantes de las disciplinas de **Kendo** e **Iaido**, la administración de
asociaciones (dojos/filiales), el control del estado de la cuota federativa
anual mediante integración con MercadoPago, la actualización del legajo de
graduaciones y la inscripción a exámenes y torneos locales.

## Datos del Sistema

### 1. Datos Personales del Usuario

- Nombre y Apellido
- Fecha de nacimiento
- DNI
- Género (Masculino / Femenino)
- Email (Utilizado como credencial/usuario)
- Contraseña
- Dirección (Calle, altura, piso/depto, ciudad, código postal)
- Asociación / Dojo (Seleccionable de una lista precargada)

### 2. Historial de Graduaciones

El sistema debe llevar dos registros independientes por usuario (uno para Kendo
y otro para Iaido):

- Graduación actual (Sin graduación / 3° a 1° Kyu / 1° a 8° Dan)
- Fecha de obtención de la última graduación (Obligatoria para validar tiempos
  de espera)

---

## Roles y Permisos

### 1. Usuario no registrado

- Puede registrarse ingresando sus datos personales, credenciales y
  seleccionando su asociación.
- El acceso al sistema queda bloqueado en estado "Pendiente" hasta que el
  administrador de su asociación apruebe el registro.

### 2. Usuario registrado básico ACTIVO

_(Tiene la cuota federativa del año en curso paga)_

- Puede ver y editar sus datos personales (excepto sus graduaciones y
  asociación, si tiene una solicitud de cambio pendiente).
- Puede modificar sus credenciales de autenticación.
- Puede ver el estado actual de su cuota.
- **Graduaciones externas:** Puede cargar un comprobante (PDF, JPEG, PNG) con su
  certificado de examen rendido fuera de la FAK para solicitar una actualización
  de graduación al Administrador General.
- **Inscripción a Eventos:** Puede generar solicitudes para participar en
  exámenes o torneos publicados por la FAK (sujeto a validación de requisitos).

### 3. Usuario registrado básico INACTIVO

_(No tiene la cuota federativa del año en curso al día)_

- Tiene los mismos permisos de edición de perfil y carga de certificados
  externos que el usuario activo.
- **Bloqueo:** No puede generar solicitudes de inscripción a torneos ni a
  exámenes.
- **Pago:** Puede hacer clic en el botón de pago de MercadoPago para abonar el
  valor actual de la cuota y pasar automáticamente al rol **Activo**.

### 4. Usuario registrado administrador de asociación

Además de sus funciones como usuario básico (activo o inactivo) dentro de su
propio perfil, posee un panel de gestión para su asociación:

- Puede aprobar o rechazar el registro de nuevos usuarios en su asociación.
- Puede aprobar o rechazar las solicitudes de inscripción a torneos o exámenes
  de los usuarios pertenecientes a su asociación.

### 5. Administrador general

Cuenta dedicada y centralizada (no es un perfil de practicante, no posee datos
personales ni deportivos).

- **ABM de Asociaciones:** Puede crear, editar y dar de baja las asociaciones
  del país que aparecerán en el formulario de registro.
- Designa qué usuarios registrados actúan como administradores de cada
  asociación.
- Gestiona las solicitudes de graduación externa, con acceso al certificado
  subido (aprueba o rechaza).
- **Gestión de Eventos:** Crea eventos de exámenes y torneos.
- **Carga de Graduaciones Locales:** Actualiza de forma masiva o individual las
  graduaciones de los alumnos que aprobaron en los exámenes oficiales
  organizados por la FAK.
- **Gestión Financiera:** Modifica el valor de la cuota federativa anual y
  define la fecha de vencimiento del período.

---

## Reglas de Negocio Centrales

### Cuota Federativa y Estados

- **Precio Único Dinámico:** La integración con MercadoPago siempre cobrará el
  valor vigente seteado por el Administrador General al momento del pago.
- **No acumulación de deuda:** La cuota es anual. Si un usuario pasa años sin
  pagar, no acumula deuda retroactiva; simplemente paga el valor del año en
  curso para reactivarse.
- **Proceso de Vencimiento Automatizado (_Cron Job_):** Al llegar la fecha de
  vencimiento definida para el año federativo, el sistema pasará automáticamente
  a estado **Inactivo** a todos los usuarios que no hayan registrado el pago del
  nuevo ciclo.

### Validación para Inscripción a Torneos

Al momento de inscribirse, el sistema calculará la edad del usuario comparando
su `fecha_nacimiento` con la `fecha_inicio` del torneo. Las categorías validarán
el género y la graduación **específica de la disciplina del torneo**:

- **Kendo Individual:**
- _Kyu (Masculino/Femenino):_ Graduación de 3° a 1° Kyu (o sin graduación) en
  Kendo + Género correspondiente.
- _Dan (Masculino/Femenino):_ Graduación de 1° a 8° Dan en Kendo + Género
  correspondiente.
- _Master:_ Edad $\ge$ 50 años al inicio del torneo.
- _Junior:_ Edad $\le$ 16 años al inicio del torneo.

- **Kendo por Equipos:** Femenino, Masculino o Junior ($\le$ 16 años) según
  corresponda.
- **Iaido:** Categorías Kyu (sin Dan) o Dan según graduación en Iaido. Equipos
  sin requisitos de graduación.

### Validación para Inscripción a Exámenes

La graduación a rendir se infiere automáticamente como la inmediata superior a
la actual en esa disciplina. Para habilitar el botón de inscripción, el sistema
comprobará que el tiempo transcurrido entre la `fecha_evento` y la
`fecha_ultima_graduacion` del usuario sea **igual o mayor** a los siguientes
mínimos:

- **De Sin Graduación a 3° Kyu:** 0 meses.
- **De 3° Kyu a 2° Kyu:** 3 meses.
- **De 2° Kyu a 1° Kyu:** 3 meses.
- **De 1° Kyu a 1° Dan:** 6 meses.
- **De Dan a Dan Superior ($N^{\circ}$ Dan a $(N+1)^{\circ}$ Dan):** $N$ años
  (Ej: de 3° Dan a 4° Dan se requieren mínimo 3 años de espera).

---

## Anexo: Estructura de Eventos

### Datos para creación de un Torneo

- Fecha de inicio y Fecha de finalización
- Ciudad, Nombre del gimnasio y Dirección (Calle y altura)
- Categorías habilitadas para el evento

### Datos para creación de un Examen

- Fecha del evento
- Ciudad, Nombre del gimnasio y Dirección (Calle y altura)
- Graduaciones que se van a evaluar en el evento
