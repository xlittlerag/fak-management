### **Especificaciones Técnicas de la API**

Este documento detalla **cómo** se implementan los requerimientos. Describe la arquitectura, los modelos de datos y los endpoints de la API.

-----

#### **1. Arquitectura y Tecnologías**

  * **Lenguaje**: Go (Golang)
  * **Framework Web**: Gin Gonic
  * **ORM**: GORM
  * **Base de Datos**: SQLite
  * **Autenticación**: JSON Web Tokens (JWT)
  * **Estructura**: Modularizada en capas (handlers, repositories, models, router).

-----

#### **2. Modelos de Datos Principales**

```go
// Representa a un practicante individual.
type Federate struct {
    gorm.Model
    IDNumber      string // DNI o identificador único
    FirstName     string
    LastName      string
    Status        string // activo, en_deuda, inactivo
    AssociationID uint   // ID de la asociación a la que pertenece
    Kendo         *ActivityRecord `gorm:"embedded;..."`
    Iaido         *ActivityRecord `gorm:"embedded;..."`
    Jodo          *ActivityRecord `gorm:"embedded;..."`
}

// Representa a una asociación o dojo.
type Association struct {
    gorm.Model
    Name      string
    Federates []Federate // Lista de federados asociados
}

// Representa a un usuario del sistema con credenciales y rol.
type User struct {
    gorm.Model
    Username      string
    Password      string // Hashed
    Role          string // admin, approved_federate, federate
    FederateID    uint   // Vinculado a un Federate si el rol es "federate"
    AssociationID uint   // Vinculado a una Association si el rol es "approved_federate"
}
```

-----

#### **3. Endpoints de la API**

Todas las rutas dentro de `/api` requieren un token JWT válido en la cabecera `Authorization: Bearer <token>`.

| Método | Ruta | Descripción | Autorización Requerida |
| :--- | :--- | :--- | :--- |
| **POST** | `/login` | Inicia sesión para obtener un token JWT. | Pública |
| **GET** | `/api/federates` | Obtiene una lista de todos los federados. | **Admin** |
| **GET** | `/api/federates/:id` | Obtiene los detalles de un federado específico. | **Admin**: Cualquiera.\<br\>**Federado Aprobado**: Solo si pertenece a su asociación.\<br\>**Federado**: Solo si es su propio perfil. |
| **GET** | `/api/associations` | Obtiene una lista de todas las asociaciones. | **Admin** |
| **POST** | `/api/associations` | Crea una nueva asociación. | **Admin** |
| **PUT** | `/api/associations/:id`| Actualiza el nombre de una asociación. | **Admin** |
| **GET** | `/api/associations/my-association` | Obtiene los detalles de la asociación del usuario. | **Federado Aprobado** |



--------------


### **Ampliación de Especificaciones Técnicas (V2)**

Detalles técnicos sobre cómo se implementarán las nuevas funcionalidades.

-----

#### **1. Nuevos Modelos de Datos**

Se añadirán los siguientes modelos a la base de datos y se modificará el modelo `Federate`.

```go
// Modificación al modelo Federate para incluir la deuda.
type Federate struct {
    gorm.Model
    // ... campos existentes ...
    DebtAmount    float64 `json:"debtAmount"` // Monto adeudado
}

// Registro de una transacción de pago.
type Payment struct {
    gorm.Model
    FederateID      uint      `json:"federateId"`
    Amount          float64   `json:"amount"`
    Status          string    `json:"status"` // "pending", "approved", "rejected"
    MercadoPagoID   string    `json:"-"`      // ID de la preferencia o pago en MercadoPago
    PaymentDate     time.Time `json:"paymentDate"`
}

// Representa un evento creado por un administrador.
type Event struct {
    gorm.Model
    Name          string    `json:"name"`
    Description   string    `json:"description"`
    EventDate     time.Time `json:"eventDate"`
    Cost          float64   `json:"cost"`
    Capacity      int       `json:"capacity"` // Cupo máximo
}

// Tabla intermedia para la inscripción de un federado a un evento.
type Registration struct {
    gorm.Model
    FederateID    uint   `json:"federateId"`
    EventID       uint   `json:"eventId"`
    Status        string `json:"status"` // "pending", "approved", "rejected"
}
```

-----

#### **2. Nuevos Endpoints de la API**

Se agregarán las siguientes rutas a la API, cada una con su respectiva autorización.

| Método | Ruta | Descripción | Autorización Requerida |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/federates/me/debt` | Un federado consulta su propia deuda. | **Federado** |
| **POST**| `/api/payments/me/create-preference`| Un federado solicita un link de pago de MercadoPago. | **Federado** |
| **POST**| `/api/payments/webhook/mercadopago` | Endpoint para recibir notificaciones de pago. | **Pública** (con validación de firma de MP) |
| **GET** | `/api/events` | Lista todos los eventos disponibles. | **Cualquier rol autenticado** |
| **POST**| `/api/events` | Un administrador crea un nuevo evento. | **Admin** |
| **POST**| `/api/events/:id/register`| Un federado se inscribe a un evento. | **Federado** |
| **GET** | `/api/associations/me/registrations` | Un federado aprobado ve las inscripciones pendientes de su asociación. | **Federado Aprobado** |
| **PUT** | `/api/registrations/:reg_id/status`| Un federado aprobado aprueba o rechaza una inscripción. | **Federado Aprobado** |
