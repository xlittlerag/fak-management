defmodule ApiWeb.AssociationControllerTest do
  use ApiWeb.ConnCase

  alias Api.FederationsFixtures
  alias Api.AccountsFixtures
  alias Api.Accounts

  describe "GET /api/associations" do
    setup do
      # Create a couple of associations for the test
      association1 = FederationsFixtures.association_fixture(%{name: "Kendo Club A"})
      FederationsFixtures.association_fixture(%{name: "Kendo Club B"})

      federate = FederationsFixtures.federate_fixture(%{association: association1})
      federate_user = AccountsFixtures.user_fixture(%{federate: federate})

      admin = AccountsFixtures.admin_user_fixture()

      %{
        admin_conn: build_conn() |> login_user(admin),
        federate_conn: build_conn() |> login_user(federate_user)
      }
    end

    test "allows an admin to list all associations", %{admin_conn: conn} do
      conn = get(conn, "/api/associations")

      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 2
      assert Enum.any?(data, &(&1["name"] == "Kendo Club A"))
    end

    test "forbids a non-admin user from listing associations", %{federate_conn: conn} do
      conn = get(conn, "/api/associations")
      assert json_response(conn, 401)["error"]["message"] == "Unauthorized"
    end
  end

  describe "POST /api/associations" do
    setup do
      admin = AccountsFixtures.admin_user_fixture()
      federate_user = AccountsFixtures.user_fixture()

      %{
        admin_conn: build_conn() |> login_user(admin),
        federate_conn: build_conn() |> login_user(federate_user)
      }
    end

    test "allows an admin to create an association with valid data", %{admin_conn: conn} do
      # Prepare the request body
      attrs = %{name: "New Kendo Association"}

      conn = post(conn, "/api/associations", %{association: attrs})

      # Expect a 201 Created response
      assert %{"data" => data} = json_response(conn, 201)
      assert data["name"] == "New Kendo Association"
    end

    test "returns an error when an admin provides invalid data", %{admin_conn: conn} do
      # Send a request with a missing name
      conn = post(conn, "/api/associations", %{association: %{name: ""}})

      # Expect a 422 Unprocessable Entity response
      assert %{"errors" => %{"name" => ["can't be blank"]}} = json_response(conn, 422)
    end

    test "forbids a non-admin user from creating an association", %{federate_conn: conn} do
      attrs = %{name: "Unauthorized Association"}

      conn = post(conn, "/api/associations", %{association: attrs})

      assert json_response(conn, 401)["error"]["message"] == "Unauthorized"
    end
  end

  describe "PUT /api/associations/:id" do
    setup do
      # Create data needed for the update tests
      association = FederationsFixtures.association_fixture()
      admin = AccountsFixtures.admin_user_fixture()
      federate_user = AccountsFixtures.user_fixture()

      %{
        association: association,
        admin_conn: build_conn() |> login_user(admin),
        federate_conn: build_conn() |> login_user(federate_user)
      }
    end

    test "allows an admin to update an association with valid data", %{
      admin_conn: conn,
      association: assoc
    } do
      # Prepare the new name
      update_attrs = %{name: "Updated Association Name"}

      conn = put(conn, "/api/associations/#{assoc.id}", %{association: update_attrs})

      # Expect a 200 OK response with the updated data
      assert %{"data" => data} = json_response(conn, 200)
      assert data["name"] == "Updated Association Name"
      assert data["id"] == assoc.id
    end

    test "returns an error when an admin provides invalid update data", %{
      admin_conn: conn,
      association: assoc
    } do
      # Send an update request with a blank name
      conn = put(conn, "/api/associations/#{assoc.id}", %{association: %{name: ""}})

      # Expect a 422 Unprocessable Entity response
      assert %{"errors" => %{"name" => ["can't be blank"]}} = json_response(conn, 422)
    end

    test "forbids a non-admin user from updating an association", %{
      federate_conn: conn,
      association: assoc
    } do
      update_attrs = %{name: "Unauthorized Update"}

      conn = put(conn, "/api/associations/#{assoc.id}", %{association: update_attrs})

      assert json_response(conn, 401)["error"]["message"] == "Unauthorized"
    end
  end

  describe "GET /api/associations/me" do
    setup do
      # Create a specific association for our approved federate
      my_assoc = FederationsFixtures.association_fixture(%{name: "My Kendo Dojo"})
      # Create another association to ensure we don't accidentally fetch it
      _other_assoc = FederationsFixtures.association_fixture(%{name: "Other Dojo"})

      # Create the three user types for testing permissions
      approved_user = AccountsFixtures.approved_federate_fixture(%{association: my_assoc})
      admin_user = AccountsFixtures.admin_user_fixture()
      federate_user = AccountsFixtures.user_fixture()

      %{
        approved_conn: build_conn() |> login_user(approved_user),
        admin_conn: build_conn() |> login_user(admin_user),
        federate_conn: build_conn() |> login_user(federate_user),
        my_assoc: my_assoc
      }
    end

    test "allows an approved federate to get their own association", %{
      approved_conn: conn,
      my_assoc: assoc
    } do
      conn = get(conn, "/api/associations/me")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == assoc.id
      assert data["name"] == "My Kendo Dojo"
    end

    test "forbids an admin from accessing this route with a specific error", %{admin_conn: conn} do
      conn = get(conn, "/api/associations/me")

      assert %{"error" => %{"message" => "Admins do not have an association"}} =
               json_response(conn, 403)
    end

    test "forbids a regular federate from accessing this route", %{federate_conn: conn} do
      conn = get(conn, "/api/associations/me")
      assert json_response(conn, 401)["error"]["message"] == "Unauthorized"
    end
  end

  defp login_user(conn, user) do
    {:ok, {token, _user}} = Accounts.login_user(user.username, "supersecret")
    put_req_header(conn, "authorization", "Bearer #{token}")
  end
end
