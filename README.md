# **Kendo Federation Management API**

## **Getting Started**

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### **Prerequisites**

* Elixir \~\> 1.15  
* Erlang/OTP \~\> 26.0  
* SQLite3

### **Installation**

1. **Clone the repository:**  
```
git clone https://github.com/xlittlerag/fak-management
```

2. **Install dependencies:**
```
mix deps.get
```

3. **Set up the database:**
```
mix ecto.setup
```

4. **Run the tests:**
```
mix test
```

5. **Start the server:**
```
mix phx.server
```

   By default, the app will be running at http://localhost:4000.

## Implementation Status

### Accounts & Authentication

* [x] POST /login - Initiates a session to obtain a JWT.
* [x] PUT /api/accounts/me/update-password - An authenticated user updates their own password.

### Federates

* [x] GET /api/federates - Retrieves a list of all federates.
* [x] POST /api/federates - An admin creates a new federate and user account.
* [x] GET /api/federates/:id - Retrieves a specific federate's details.
* [x] PUT /api/federates/:id - An admin updates a federate's details.

### Associations

* [x] GET /api/associations - Retrieves a list of all associations.
* [x] POST /api/associations - Creates a new association.
* [x] PUT /api/associations/:id - Updates an association's name.
* [x] GET /api/associations/me - Retrieves the user's own association details.
* [ ] GET /api/associations/me/registrations - An approved federate views pending registrations for their association.

### Events & Registrations

* [ ] GET /api/events - Lists all available events.
* [ ] POST /api/events - An administrator creates a new event.
* [ ] POST /api/events/:id/register - A federate registers for an event.
* [ ] PUT /api/registrations/:reg_id/status - An approved federate approves or rejects a registration.

### Payments

* [ ] POST /api/payments/me/create-payment - A federate requests a MercadoPago payment link.
* [ ] POST /api/payments/webhook/mercadopago - Endpoint for receiving payment notifications.
