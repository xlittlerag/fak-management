# **Kendo Federation Management API**

This is the official backend API for the Kendo Federation management application.
The API is designed to be a secure and reliable JSON interface for any front-end client (web, mobile, etc.).

## **Getting Started**

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### **Prerequisites**

* Elixir \~\> 1.15  
* Erlang/OTP \~\> 26.0  
* SQLite3

### **Installation**

1. **Clone the repository:**  
   git clone ...  
   cd api

2. **Install dependencies:**
   Fetch all the necessary Elixir packages.  
   mix deps.get

3. **Set up the database:**
   This command will create the database, run all migrations, and populate it with any initial seed data.  
   mix ecto.setup

4. **Run the tests:**
   Verify that your local setup is correct by running the full test suite. All tests should pass.  
   mix test

5. **Start the server:**
   You can now run the Phoenix server.  
   mix phx.server

   By default, the API will be running at http://localhost:4000.

## Implementation Status

### Accounts & Authentication

* [x] POST /login - Initiates a session to obtain a JWT.
* [x] PUT /api/accounts/me/update-password - An authenticated user updates their own password.

### Federates

* [x] GET /api/federates - Retrieves a list of all federates.
* [x] POST /api/federates - An admin creates a new federate and user account.
* [x] GET /api/federates/:id - Retrieves a specific federate's details.
* [ ] PUT /api/federates/:id - An admin updates a federate's details.
* [ ] GET /api/federates/me/debt - Allows a federate to check their own debt.

### Associations

* [x] GET /api/associations - Retrieves a list of all associations.
* [x] POST /api/associations - Creates a new association.
* [x] PUT /api/associations/:id - Updates an association's name.
* [x] GET /api/associations/my-association - Retrieves the user's own association details.
* [ ] GET /api/associations/me/registrations - An approved federate views pending registrations for their association.

### Events & Registrations

* [ ] GET /api/events - Lists all available events.
* [ ] POST /api/events - An administrator creates a new event.
* [ ] POST /api/events/:id/register - A federate registers for an event.
* [ ] PUT /api/registrations/:reg_id/status - An approved federate approves or rejects a registration.

### Payments

* [ ] POST /api/payments/me/create-preference - A federate requests a MercadoPago payment link.
* [ ] POST /api/payments/webhook/mercadopago - Endpoint for receiving payment notifications.
