defmodule ApiWeb.FederateControllerTest do
  use ApiWeb.ConnCase, async: true

  alias Api.FederationsFixtures
  alias Api.AccountsFixtures
  alias Api.Accounts

  describe "GET /api/federates" do
    setup do
      # Create a few federates to ensure the list is not empty
      FederationsFixtures.federate_fixture()
      FederationsFixtures.federate_fixture()

      # Create an admin user for authorized requests
      admin = AccountsFixtures.admin_user_fixture()
      # Create a regular federate user for unauthorized requests
      federate_user = AccountsFixtures.user_fixture()

      %{
        admin_conn: build_conn() |> login_user(admin),
        federate_conn: build_conn() |> login_user(federate_user),
        unauthed_conn: build_conn()
      }
    end

    test "allows an admin to list all federates", %{admin_conn: conn} do
      conn = get(conn, "/api/federates")
      assert json_response(conn, 200)
      # The response should contain a "data" key with a list of federates
      assert %{"data" => [_ | _]} = json_response(conn, 200)
    end

    test "forbids a non-admin user from listing federates", %{federate_conn: conn} do
      conn = get(conn, "/api/federates")
      assert json_response(conn, 401)["error"]["message"] == "Unauthorized"
    end

    test "forbids an unauthenticated request from listing federates", %{unauthed_conn: conn} do
      conn = get(conn, "/api/federates")
      # Unauthenticated requests should also get a 401
      assert json_response(conn, 401)["error"]["message"] == "Unauthorized"
    end
  end

  describe "GET /api/federates/:id" do
    setup do
      # Create a rich set of data to test all permission scenarios
      association1 = FederationsFixtures.association_fixture()
      association2 = FederationsFixtures.association_fixture()

      federate1_assoc1 = FederationsFixtures.federate_fixture(%{association: association1})
      federate2_assoc2 = FederationsFixtures.federate_fixture(%{association: association2})

      admin_user = AccountsFixtures.admin_user_fixture()
      federate_user = AccountsFixtures.user_fixture(%{federate: federate1_assoc1})

      approved_user_assoc1 =
        AccountsFixtures.approved_federate_fixture(%{association: association1})

      %{
        admin_conn: build_conn() |> login_user(admin_user),
        federate_conn: build_conn() |> login_user(federate_user),
        approved_conn: build_conn() |> login_user(approved_user_assoc1),
        federate1: federate1_assoc1,
        federate2: federate2_assoc2
      }
    end

    # --- Admin Tests ---
    test "allows an admin to get any federate", %{admin_conn: conn, federate1: f1, federate2: f2} do
      conn = get(conn, "/api/federates/#{f1.id}")
      assert json_response(conn, 200)["data"]["id"] == f1.id

      conn = get(conn, "/api/federates/#{f2.id}")
      assert json_response(conn, 200)["data"]["id"] == f2.id
    end

    # --- "Approved Federate" Tests ---
    test "allows an approved federate to get a federate from their own association", %{
      approved_conn: conn,
      federate1: f1
    } do
      conn = get(conn, "/api/federates/#{f1.id}")
      assert json_response(conn, 200)["data"]["id"] == f1.id
    end

    test "forbids an approved federate from getting a federate from another association", %{
      approved_conn: conn,
      federate2: f2
    } do
      conn = get(conn, "/api/federates/#{f2.id}")
      assert json_response(conn, 401)["error"]["message"] == "Unauthorized"
    end

    # --- "Federate" Tests ---
    test "allows a federate to get their own profile", %{federate_conn: conn, federate1: f1} do
      conn = get(conn, "/api/federates/#{f1.id}")
      assert json_response(conn, 200)["data"]["id"] == f1.id
    end

    test "forbids a federate from getting another federate's profile", %{
      federate_conn: conn,
      federate2: f2
    } do
      conn = get(conn, "/api/federates/#{f2.id}")
      assert json_response(conn, 401)["error"]["message"] == "Unauthorized"
    end
  end

  describe "POST /api/federates" do
    setup do
      # We need an association to assign the new federate to.
      association = FederationsFixtures.association_fixture()
      admin = AccountsFixtures.admin_user_fixture()
      federate_user = AccountsFixtures.user_fixture()

      %{
        association: association,
        admin_conn: build_conn() |> login_user(admin),
        federate_conn: build_conn() |> login_user(federate_user)
      }
    end

    test "allows an admin to create a federate and user with valid data", %{
      admin_conn: conn,
      association: assoc
    } do
      # The attributes for the new federate.
      # The username will be derived from the id_number.
      attrs = %{
        first_name: "Jane",
        last_name: "Doe",
        id_number: "12345678",
        association_id: assoc.id
      }

      conn = post(conn, "/api/federates", %{federate: attrs})

      # Assert the response is 201 Created and has the correct structure.
      assert %{"data" => data, "generated_password" => password} = json_response(conn, 201)
      assert data["first_name"] == "Jane"
      assert data["id_number"] == "12345678"
      assert is_binary(password) and String.length(password) > 8

      # Verify that we can log in as the new user with the generated password.
      assert {:ok, _} = Accounts.login_user("12345678", password)
    end

    test "returns an error when an admin provides invalid data", %{admin_conn: conn} do
      # Send a request with a missing first_name.
      conn = post(conn, "/api/federates", %{federate: %{last_name: "Doe"}})

      assert %{"errors" => errors} = json_response(conn, 422)
      assert errors["first_name"] == ["can't be blank"]
    end

    test "forbids a non-admin user from creating a federate", %{federate_conn: conn} do
      attrs = %{first_name: "Unauthorized", last_name: "User"}
      conn = post(conn, "/api/federates", %{federate: attrs})
      assert json_response(conn, 401)["error"]["message"] == "Unauthorized"
    end
  end

  describe "PUT /api/federates/:id" do
    setup do
      # Create a federate to be updated in the tests
      federate = FederationsFixtures.federate_fixture()
      admin_user = AccountsFixtures.admin_user_fixture()
      non_admin_user = AccountsFixtures.user_fixture()

      %{
        federate: federate,
        admin_conn: build_conn() |> login_user(admin_user),
        non_admin_conn: build_conn() |> login_user(non_admin_user)
      }
    end

    test "allows an admin to update a federate with valid data", %{
      admin_conn: conn,
      federate: federate
    } do
      update_attrs = %{
        first_name: "John Updated",
        last_name: "Doe Updated",
        status: "inactive"
      }

      conn = put(conn, "/api/federates/#{federate.id}", %{federate: update_attrs})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == federate.id
      assert data["first_name"] == "John Updated"
      assert data["status"] == "inactive"
    end

    test "returns an error when an admin provides invalid data", %{
      admin_conn: conn,
      federate: federate
    } do
      # Attempt to update with a blank first name
      update_attrs = %{first_name: ""}
      conn = put(conn, "/api/federates/#{federate.id}", %{federate: update_attrs})

      assert %{"errors" => %{"first_name" => ["can't be blank"]}} = json_response(conn, 422)
    end

    test "forbids a non-admin user from updating a federate", %{
      non_admin_conn: conn,
      federate: federate
    } do
      update_attrs = %{first_name: "Unauthorized"}
      conn = put(conn, "/api/federates/#{federate.id}", %{federate: update_attrs})

      assert json_response(conn, 401)["error"]["message"] == "Unauthorized"
    end

    test "returns a 404 if an admin tries to update a non-existent federate", %{admin_conn: conn} do
      conn = put(conn, "/api/federates/999999", %{federate: %{first_name: "Ghost"}})
      assert json_response(conn, 404)
    end
  end

  # Helper to sign in a user and add the auth header to the connection
  defp login_user(conn, user) do
    {:ok, {token, _user}} = Accounts.login_user(user.username, "supersecret")
    put_req_header(conn, "authorization", "Bearer #{token}")
  end
end
