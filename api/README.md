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
