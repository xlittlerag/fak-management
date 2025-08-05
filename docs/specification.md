### **Elixir/Phoenix API Technical Specification**

This document details the architecture, data schemas, and API endpoints for the application. The implementation uses the Elixir language and Phoenix framework, emphasizing a domain-driven approach with Contexts.

-----

### **Architecture and Technologies** ⚙️

The stack is chosen to leverage the strengths of the Elixir ecosystem for building robust and maintainable web applications.

  * **Language**: **Elixir**. Running on the BEAM (Erlang VM), it provides exceptional concurrency and fault tolerance, which is ideal for a responsive API.
  * **Framework**: **Phoenix**. A productive web framework that provides excellent structure, tooling, and performance.
  * **Data Mapper**: **Ecto**. The standard for data interaction in Elixir. It promotes data integrity and clear queries through the use of **Changesets**.
  * **Database**: **SQLite**. A lightweight, file-based database suitable for applications that don't require high levels of concurrent write operations. It is managed via the `ecto_sqlite3` adapter.
  * **Authentication**: **Phoenix Tokens**. We will use Phoenix's built-in `Phoenix.Token` for creating and verifying secure JSON Web Tokens (JWTs).
  * **Structure**: **Domain-Driven Contexts**. Business logic is organized into modules called "Contexts," each responsible for a specific domain (e.g., `Accounts`, `Federations`), separating concerns from the web layer.

-----

### **Core Schemas and Contexts** 🗂️

Data is represented by Ecto schemas, and business logic is encapsulated within context modules. This separation ensures that the core application logic is independent of the web interface.

#### **Proposed Contexts**

  * `KendoApp.Federations`: Manages federates and associations.
  * `KendoApp.Accounts`: Handles users, roles, and authentication.
  * `KendoApp.Events`: Manages events and registrations.
  * `KendoApp.Payments`: Manages payment records and third-party integrations.

#### **Ecto Schemas**

```elixir
# lib/kendo_app/federations/federate.ex
defmodule KendoApp.Federations.Federate do
  use Ecto.Schema

  schema "federates" do
    field :id_number, :string
    field :first_name, :string
    field :last_name, :string
    field :status, :string, default: "activo"
    field :debt_amount, :float, default: 0.0

    belongs_to :association, KendoApp.Federations.Association
    timestamps()
  end
end

# lib/kendo_app/accounts/user.ex
defmodule KendoApp.Accounts.User do
  use Ecto.Schema

  schema "users" do
    field :username, :string
    field :password, :string, virtual: true
    field :password_hash, :string
    field :role, Ecto.Enum, values: [:admin, :approved_federate, :federate]

    belongs_to :federate, Api.Federations.Federate, foreign_key: :federate_id, type: :id
    belongs_to :association, Api.Federations.Association, foreign_key: :association_id, type: :id

    timestamps()
  end
end


# lib/kendo_app/events/event.ex
defmodule KendoApp.Events.Event do
  use Ecto.Schema

  schema "events" do
    field :name, :string
    field :description, :string
    field :event_date, :utc_datetime
    field :cost, :float
    field :capacity, :integer

    has_many :registrations, KendoApp.Events.Registration
    timestamps()
  end
end

# lib/kendo_app/events/registration.ex
defmodule KendoApp.Events.Registration do
  use Ecto.Schema

  schema "registrations" do
    field :status, :string, default: "pending"

    belongs_to :federate, KendoApp.Federations.Federate
    belongs_to :event, KendoApp.Events.Event
    timestamps()
  end
end

# lib/kendo_app/payments/payment.ex
defmodule KendoApp.Payments.Payment do
  use Ecto.Schema

  schema "payments" do
    field :amount, :float
    field :status, :string, default: "pending"
    field :mercadopago_id, :string
    field :payment_date, :utc_datetime

    belongs_to :federate, KendoApp.Federations.Federate
    timestamps()
  end
end
```

-----

### **API Endpoints and Authorization** Endpoints are defined in the Phoenix Router. Authorization is handled declaratively using a custom **Plug**, which is a composable function that processes the request before it reaches the main controller action.

#### **Authorization Plug**

A custom plug, `KendoAppWeb.Plugs.Authorize`, will be created. It will inspect the JWT from the `Authorization: Bearer <token>` header, load the associated user, and verify their role against the required role for the requested endpoint.

#### **Endpoint Definitions**

| Method | Route | Description | Authorization Required |
| :--- | :--- | :--- | :--- |
| **POST** | `/login` | Initiates a session to obtain a JWT. | Public |
| **GET** | `/api/federates` | Retrieves a list of all federates. | **Admin** |
| **POST** | `/api/federates` | An admin creates a new federate profile and a corresponding user account with a random password. The response includes this password. | **Admin** |
| **GET** | `/api/federates/:id` | Retrieves a specific federate's details. | **Admin**: Any. \<br\> **Approved Federate**: Only from their association. \<br\> **Federate**: Only their own profile. |
| **PUT** | `/api/federates/:id` | An admin updates a federate's details. | **Admin** |
| **PUT** | `/api/federates/me/update-password` | An authenticated user updates their own password. Requires current and new password. | **Any authenticated role** |
| **GET** | `/api/associations` | Retrieves a list of all associations. | **Admin** |
| **POST** | `/api/associations` | Creates a new association. | **Admin** |
| **PUT** | `/api/associations/:id` | Updates an association's name. | **Admin** |
| **GET** | `/api/associations/mine` | Retrieves the user's own association details. | **Approved Federate** |
| **GET** | `/api/federates/me/debt` | Allows a federate to check their own debt. | **Federate** |
| **POST** | `/api/payments/me/create-preference`| A federate requests a MercadoPago payment link. | **Federate** |
| **POST** | `/api/payments/webhook/mercadopago` | Endpoint for receiving payment notifications. | **Public** (with MP signature validation) |
| **GET** | `/api/events` | Lists all available events. | **Any authenticated role** |
| **POST** | `/api/events` | An administrator creates a new event. | **Admin** |
| **POST** | `/api/events/:id/register`| A federate registers for an event. | **Federate** |
| **GET** | `/api/associations/me/registrations` | An approved federate views pending registrations for their association. | **Approved Federate** |
| **PUT** | `/api/registrations/:reg_id/status`| An approved federate approves or rejects a registration. | **Approved Federate** |
