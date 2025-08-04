defmodule ApiWeb.FederateControllerTest do
  use ApiWeb.ConnCase, async: true

  alias Api.FederationsFixtures
  alias Api.AccountsFixtures
  alias Api.Accounts

  describe "GET /api/federates" do
    setup do
      # Ecto.Adapters.SQL.Sandbox.allow(Api.Repo, self(), self())

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

  # Helper to sign in a user and add the auth header to the connection
  defp login_user(conn, user) do
    {:ok, {token, _user}} = Accounts.login_user(user.username, "supersecret")
    put_req_header(conn, "authorization", "Bearer #{token}")
  end
end
