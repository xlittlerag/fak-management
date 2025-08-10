defmodule ApiWeb.AccountController do
  use ApiWeb, :controller

  alias Api.Accounts

  action_fallback ApiWeb.FallbackController

  def update_password(conn, %{"user" => user_params}) do
    # The user is retrieved from the token, ensuring they can only update their own password.
    user = conn.assigns.current_user

    case Accounts.update_password(user, user_params) do
      {:ok, _user} ->
        json(conn, %{data: %{message: "Password updated successfully"}})

      {:error, changeset} ->
        {:error, changeset}
    end
  end
end
