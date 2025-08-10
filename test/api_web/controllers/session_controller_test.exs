defmodule ApiWeb.SessionControllerTest do
  use ApiWeb.ConnCase, async: true

  alias Api.AccountsFixtures

  describe "POST /api/login" do
    setup do
      # Create a user with a known password for our tests
      user = AccountsFixtures.user_fixture(%{password: "valid-password"})
      %{user: user}
    end

    test "logs in a user with valid credentials", %{conn: conn, user: user} do
      # Prepare the request body with the correct credentials
      body = %{"username" => user.username, "password" => "valid-password"}

      # Send the request to the endpoint
      conn = post(conn, "/api/login", body)

      # Assert the response is what we expect
      assert %{"jwt" => jwt, "user" => returned_user} = json_response(conn, 200)
      assert returned_user["id"] == user.id
      assert returned_user["username"] == user.username

      # Optional: Verify the token is valid (requires a helper or direct use of Phoenix.Token)
      # This adds an extra layer of confidence
      assert {:ok, data} = Api.Accounts.verify_token(jwt)
      assert data[:user_id] == user.id
    end

    test "returns unauthorized with invalid password", %{conn: conn, user: user} do
      # Prepare the request body with an incorrect password
      body = %{"username" => user.username, "password" => "wrong-password"}

      conn = post(conn, "/api/login", body)

      # Assert the server responds with an unauthorized error
      assert %{"error" => %{"message" => "invalid_credentials"}} = json_response(conn, 401)
    end

    test "returns unauthorized for a non-existent user", %{conn: conn} do
      # Prepare the request body with a username that does not exist
      body = %{"username" => "nouser@exists.com", "password" => "anypassword"}

      conn = post(conn, "/api/login", body)

      # Assert the server responds with an unauthorized error
      # We use 401 to avoid revealing whether a user account exists or not
      assert %{"error" => %{"message" => "invalid_credentials"}} = json_response(conn, 401)
    end
  end
end
