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

  # Helper to sign in a user and add the auth header to the connection
  defp login_user(conn, user) do
    {:ok, {token, _user}} = Accounts.login_user(user.username, "supersecret")
    put_req_header(conn, "authorization", "Bearer #{token}")
  end
end
