defmodule ApiWeb.SessionController do
  use ApiWeb, :controller

  alias Api.Accounts

  def create(conn, %{"username" => username, "password" => password}) do
    case Accounts.login_user(username, password) do
      {:ok, {jwt, user}} ->
        conn
        |> put_status(:ok)
        |> json(%{
          jwt: jwt,
          user: %{
            id: user.id,
            username: user.username,
            role: user.role
          }
        })

      {:error, reason} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: %{message: reason}})
    end
  end
end
