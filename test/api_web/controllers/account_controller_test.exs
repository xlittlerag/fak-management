defmodule ApiWeb.AccountControllerTest do
  use ApiWeb.ConnCase

  alias Api.AccountsFixtures
  alias Api.Accounts

  describe "PUT /api/accounts/me/update-password" do
    setup do
      # Create a user with a known password
      user = AccountsFixtures.user_fixture(%{password: "current-password"})

      %{
        user: user,
        conn: build_conn() |> login_user(user, "current-password")
      }
    end

    test "allows a user to update their password with valid data", %{user: user, conn: conn} do
      attrs = %{
        "current_password" => "current-password",
        "password" => "new-secure-password"
      }

      conn = put(conn, "/api/accounts/me/update-password", %{user: attrs})

      # Expect a 200 OK response with a success message
      assert %{"data" => %{"message" => "Password updated successfully"}} =
               json_response(conn, 200)

      # Verify the old password no longer works
      assert {:error, :invalid_credentials} =
               Accounts.login_user(user.username, "current-password")

      # Verify the new password works
      assert {:ok, _} = Accounts.login_user(user.username, "new-secure-password")
    end

    test "returns an error if the current password is incorrect", %{conn: conn} do
      attrs = %{
        "current_password" => "wrong-password",
        "password" => "new-secure-password"
      }

      conn = put(conn, "/api/accounts/me/update-password", %{user: attrs})

      assert %{"errors" => %{"current_password" => ["is invalid"]}} = json_response(conn, 422)
    end

    test "forbids an unauthenticated request", %{} do
      conn = put(build_conn(), "/api/accounts/me/update-password", %{})
      assert json_response(conn, 401)["error"]["message"] == "Unauthorized"
    end
  end

  defp login_user(conn, user, password) do
    {:ok, {token, _user}} = Accounts.login_user(user.username, password)
    put_req_header(conn, "authorization", "Bearer #{token}")
  end
end
