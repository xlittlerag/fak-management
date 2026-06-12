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
- DNI (Utilizado como credencial única de inicio de sesión, no editable)
- Género (Masculino / Femenino)
- Email (Editable por el usuario)
- Contraseña
- Dirección (Calle, altura, piso/depto, ciudad, código postal, provincia)
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
  seleccionando su asociación. El login se realiza con DNI y Contraseña.
- El acceso al sistema queda bloqueado en estado "Pendiente" hasta que el
  administrador de su asociación apruebe el registro.

### 2. Usuario registrado básico ACTIVO

_(Tiene la cuota federativa del año en curso paga)_

- Puede ver y editar sus datos personales (incluyendo Email).
- Puede modificar su contraseña desde su perfil.
- Puede ver el estado actual de su cuota y sus graduaciones vigentes.
- **Blanqueo de Contraseña:** Si olvida su contraseña, puede solicitar un "Blanqueo". Esta solicitud debe ser aprobada por un administrador. Una vez aprobada, podrá ingresar con cualquier contraseña, la cual se guardará como su nueva credencial.
- **Graduaciones externas:** Puede cargar un comprobante para solicitar una actualización de graduación al Administrador General.

### 3. Usuario registrado básico INACTIVO

- Mismos permisos de edición de perfil y blanqueo que el usuario activo.
- **Bloqueo:** No puede inscribirse a eventos.

### 4. Usuario registrado administrador de asociación

Además de sus funciones como usuario básico dentro de su propio perfil:

- Puede ver la lista de todos los usuarios de su asociación.
- Puede aprobar/rechazar registros y solicitudes de blanqueo de su asociación.

### 5. Administrador general

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
