### **Requerimientos del Sistema de Gestión de Federados**

Este documento describe las funcionalidades y objetivos del sistema. Se enfoca en el **qué** debe hacer la aplicación desde la perspectiva del usuario y del negocio.

-----

#### **1. Resumen del Proyecto**

El objetivo principal es desarrollar una API RESTful para gestionar la información de los federados de artes marciales, sus graduaciones y las asociaciones a las que pertenecen. El sistema debe contar con un esquema de permisos y roles para garantizar la seguridad y la privacidad de los datos.

-----

#### **2. Roles de Usuario**

El sistema define tres roles con distintos niveles de acceso:

  * **Federado**: Un practicante individual cuya información está en el sistema.
  * **Federado Aprobado**: Un representante de una asociación (por ejemplo, el presidente o secretario) que puede gestionar la información de los miembros de su propia asociación.
  * **Administrador**: Un superusuario con control total sobre todos los datos del sistema, incluyendo federados y asociaciones.

-----

#### **3. Requerimientos Funcionales**

##### **Autenticación**

  * El sistema debe permitir a los usuarios iniciar sesión proveyendo un nombre de usuario y contraseña.
  * Tras una autenticación exitosa, el sistema debe devolver un token que se usará para autorizar las solicitudes posteriores.

##### **Funcionalidades por Rol**

  * **Como Administrador, quiero poder:**

      * Crear, leer, actualizar y eliminar la información de cualquier federado.
      * Crear, leer, actualizar y eliminar asociaciones.
      * Obtener una lista de todos los federados registrados en el sistema.
      * Obtener una lista de todas las asociaciones existentes.
      * Aprobar a un federado para que se convierta en "Federado Aprobado".

  * **Como Federado Aprobado, quiero poder:**

      * Ver el estado y los datos de todos los federados que pertenecen a mi misma asociación.
      * Ver la información detallada de mi propia asociación, incluyendo la lista de sus miembros.
      * No poder ver la información de federados o asociaciones a las que no pertenezco.

  * **Como Federado, quiero poder:**

      * Ver únicamente mi propio estado y registro de actividad (Kendo, Iaido, Jodo).
      * No poder ver la información de ningún otro federado.

---------------

### **Requerimientos para Futuras Iteraciones (V2)**

Esta sección describe las nuevas funcionalidades que se incorporarán en la siguiente versión de la aplicación.

-----

#### **1. Módulo de Pagos y Tesorería**

El objetivo es integrar una pasarela de pagos para automatizar la gestión de cuotas federativas, mejorando la recaudación y reduciendo la carga administrativa.

##### **Requerimientos Funcionales**

  * **Como Federado, quiero poder:**

      * Consultar mi estado de cuenta y ver si adeudo alguna cuota.
      * Generar un enlace de pago a través de **MercadoPago** para saldar mi deuda de forma segura.
      * Ver mi historial de pagos realizados.

  * **Como Federado Aprobado, quiero poder:**

      * Consultar el estado de deuda de cada uno de los federados que pertenecen a mi asociación.

  * **Como Administrador, quiero poder:**

      * Configurar los montos y las fechas de vencimiento de las cuotas federativas.
      * Ver un reporte general de deudas por asociación y a nivel global.

  * **Como Sistema:**

      * La aplicación debe recibir notificaciones de MercadoPago (webhooks) para confirmar los pagos.
      * Al confirmarse un pago, el sistema debe actualizar automáticamente el `Status` del federado a "**activo**" y registrar el pago en su historial.

-----

#### **2. Módulo de Inscripción a Eventos**

El objetivo es centralizar y facilitar el proceso de inscripción a eventos como seminarios, torneos o exámenes.

##### **Requerimientos Funcionales**

  * **Como Administrador, quiero poder:**

      * Crear y publicar nuevos eventos (ej. "Seminario de Verano 2026").
      * Definir los detalles de cada evento: nombre, fecha, costo, cupo máximo y descripción.
      * Ver la lista completa de inscriptos y su estado (pendiente, aprobado) para cualquier evento.

  * **Como Federado, quiero poder:**

      * Ver una lista de los próximos eventos disponibles.
      * Inscribirme a un evento, quedando mi solicitud en estado "**pendiente**" de aprobación.

  * **Como Federado Aprobado, quiero poder:**

      * Recibir una notificación o poder consultar las solicitudes de inscripción de los federados de mi asociación.
      * **Aprobar** o **rechazar** dichas solicitudes de inscripción.
