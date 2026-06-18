# Requerimiento: Kendo Manager

## Descripción General

Kendo Manager es una aplicación web para llevar el registro de los practicantes de la **Federación Argentina de Kendo**. Permite la gestión de practicantes de las disciplinas de **Kendo**, **Iaido** y **Jodo**, la administración de asociaciones (dojos/filiales), el control del estado de la cuota federativa anual mediante integración con MercadoPago, la actualización del legajo de graduaciones y la inscripción a exámenes y torneos locales.

El sistema está pensado para ser utilizado por practicantes, administradores de asociación y un administrador general, con una expectativa de **baja concurrencia** (menos de 50 usuarios simultáneos) y un volumen de datos reducido, acorde a la cantidad de practicantes federados en Argentina.

---

## Datos del Sistema

### 1\. Datos Personales del Usuario

- Nombre y Apellido  
- Fecha de nacimiento  
- DNI (Utilizado como credencial única de inicio de sesión, no editable)  
- Sexo (Masculino / Femenino)  
- Email (Editable por el usuario)  
- Contraseña  
- Dirección (Calle, altura, piso/depto, ciudad, código postal, provincia)  
- Asociación  (Seleccionable de una lista precargada)  
- Dojo  (Seleccionable de una lista precargada en base a la asociacion)

### 2\. Historial de Graduaciones

El sistema debe llevar dos registros independientes por usuario (uno para Kendo, otro para Iaido y otro más para Jodo):

- Graduación actual (Sin graduación / 3° a 1° Kyu / 1° a 8° Dan)  
- Fecha de obtención de la última graduación (Obligatoria para validar tiempos de espera)

---

## Roles y Permisos

### 1\. Usuario no registrado

- Puede registrarse ingresando sus datos personales, credenciales y seleccionando su asociación. El login se realiza con DNI y Contraseña.  
- Debe pagar el año en curso para que, al finalizar el proceso de registro, sea usuario activo. Sino, al ser aprobado, debe quedar como usuario registrado inactivo.  
- El acceso al sistema queda bloqueado en estado "Pendiente" hasta que el administrador de su asociación apruebe el registro.

### 2\. Usuario registrado básico ACTIVO

*(Tiene la cuota federativa del año en curso paga)*

- Puede ver y editar sus datos personales (incluyendo Email).  
- Puede modificar su contraseña desde su perfil.  
- Puede ver el estado actual de su cuota y sus graduaciones vigentes.  
- **Blanqueo de Contraseña:** Si olvida su contraseña, puede solicitar un "Blanqueo". Esta solicitud debe ser aprobada por un administrador. Una vez aprobada, podrá ingresar con cualquier contraseña, la cual se guardará como su nueva credencial.  
- **Graduaciones externas:** Puede cargar una versión escaneada de diploma para solicitar una actualización de graduación. Debe ser aprobado primero por el administrador de la asociación y luego por el administrador general.  
- Puede solicitar inscribirse a eventos (torneos, exámenes o seminarios). Primero, el sistema debe validar que el usuario cumple con los requisitos para participar; luego el administrador de la asociación debe aprobarlo; finalmente, el usuario debe realizar el pago del coste de inscripción.   
- Puede solicitar la reimpresión de su diploma. Esto tiene un precio. No requiere validación.

### 3\. Usuario registrado básico INACTIVO

- Mismos permisos de edición de perfil y blanqueo que el usuario activo.  
- **Bloqueo:** No puede inscribirse a eventos.

### 4\. Usuario registrado administrador de asociación

Además de sus funciones como usuario básico dentro de su propio perfil:

- Puede ver la lista de todos los usuarios de su asociación.  
- Puede aprobar/rechazar registros y solicitudes de blanqueo de su asociación.  
- También debe poder solicitar la desafiliación de socios. Si el socio la solicita debe ser automático en informar a la asociación y a federación. Si la asociación solicita la baja debe aprobar la federación antes. Si otra asociación solicita el alta, o admite alta solicitada por el usuario debe informar a federación y dar alta automática 

### 5\. Administrador general

Cuenta dedicada y centralizada.

- Utiliza el DNI "0" para el inicio de sesión.  
- ABM de Asociaciones.  
- Designa administradores de asociaciones.  
- Asigna y actualiza graduaciones.  
- Aprueba blanqueos de contraseña de cualquier usuario.

---

## Reglas de Negocio Centrales

### Autenticación y Seguridad

- **Login:** Se realiza mediante DNI y Contraseña.  
- **Blanqueo de Contraseña:**  
  1. El usuario solicita blanqueo indicando su DNI.  
  2. El administrador aprueba la solicitud.  
  3. El usuario inicia sesión; el sistema detecta el blanqueo aprobado, acepta la contraseña ingresada, la hashea y actualiza la base de datos, desactivando el estado de blanqueo.

---

## Mantenimiento y Soporte

Además del desarrollo de la aplicación, se contemplan los siguientes servicios para garantizar su operación continua a lo largo del tiempo.

### 1\. Infraestructura y Hosting

La aplicación requiere un entorno de hosting administrado con recursos acordes a su demanda esperada. Debe incluir:

- Servidor con capacidad de cómputo y memoria suficiente para el funcionamiento estable de la aplicación y la base de datos.  
- Base de datos relacional para el almacenamiento de la información de usuarios, graduaciones, asociaciones y transacciones.  
- Certificado SSL para asegurar la comunicación mediante HTTPS.  
- Sistema de backups automatizados con frecuencia diaria, con posibilidad de restauración ante eventualidades.  
- Acuerdo de Nivel de Servicio (SLA) que garantice un porcentaje mínimo de disponibilidad.

### 2\. Soporte Técnico

Se debe proveer soporte para la resolución de incidencias operativas y dudas de uso del sistema. El soporte se clasifica en los siguientes niveles:

| Nivel | Descripción | Tiempo de Respuesta Esperado |
| :---- | :---- | :---- |
| **Nivel 1** | Consultas de usuarios sobre el uso de la plataforma (ej. cómo registrarse, cómo solicitar blanqueo). | 48 horas hábiles |
| **Nivel 2** | Incidencias técnicas que impiden el funcionamiento normal (ej. error al iniciar sesión, problemas con pagos). | 24 horas hábiles |
| **Nivel 3** | Caída total del sistema o violación de seguridad crítica. | 6 horas hábiles |

### 3\. Mantenimiento Preventivo y Correctivo

Se realizarán tareas periódicas para garantizar la estabilidad, seguridad y performance del sistema:

| Actividad | Frecuencia | Descripción |
| :---- | :---- | :---- |
| **Actualizaciones de seguridad** | Trimestral | Aplicación de parches de seguridad a librerías, frameworks y dependencias del backend y frontend. |
| **Monitoreo de performance** | Mensual | Revisión de logs, tiempos de respuesta y uso de recursos del servidor. |
| **Verificación de backups** | Mensual | Comprobación de integridad de las copias de seguridad y pruebas de restauración en entorno controlado. |
| **Corrección de bugs** | Bajo demanda | Resolución de errores reportados por los usuarios que afecten la funcionalidad esperada. |
| **Actualizaciones de integración** | Anual | Verificación de que la integración con MercadoPago u otros servicios externos siga funcionando correctamente ante cambios en sus APIs. |

### 4\. Desarrollo de Nuevas Funcionalidades

Cualquier nueva funcionalidad no contemplada en este requerimiento inicial deberá ser relevada, presupuestada y desarrollada de forma independiente. El proceso sugerido es:

1. **Relevamiento:** El solicitante describe la nueva funcionalidad.  
2. **Estimación:** Se evalúa el esfuerzo técnico requerido y se cotiza como un proyecto independiente.  
3. **Aprobación:** La comisión directiva de la FAK aprueba la ejecución.  
4. **Desarrollo e implementación:** Se lleva a cabo el desarrollo, pruebas y puesta en producción.

---

## Anexo: Glosario de Términos

| Término | Definición |
| :---- | :---- |
| **ABM** | Altas, Bajas y Modificaciones (operaciones CRUD: Create, Read, Update, Delete). |
| **Blanqueo** | Proceso de restablecimiento de contraseña aprobado por un administrador, que permite al usuario ingresar con cualquier contraseña para luego fijar una nueva. |
| **FAK** | Federación Argentina de Kendo. |
| **Graduación** | Grado obtenido en Kendo, Iaido o Jodo (Kyu o Dan). |
| **SLA** | Service Level Agreement (Acuerdo de Nivel de Servicio). |

