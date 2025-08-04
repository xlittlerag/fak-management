defmodule ApiWeb.Plugs.Authorize do
  import Plug.Conn
  alias ApiWeb.Endpoint
  alias Api.Accounts
  alias Api.Accounts.User

  def init(opts), do: opts

  def call(conn, {mod, fun}) do
    check_function = fn conn, user -> apply(mod, fun, [conn, user]) end
    authorize(conn, check_function)
  end

  def call(conn, required_role) when is_atom(required_role) do
    check_function = fn _conn, user -> has_simple_permission?(user, required_role) end
    authorize(conn, check_function)
  end

  defp authorize(conn, check_function) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, %{:user_id => user_id}} <-
           Phoenix.Token.verify(Endpoint, "user", token, max_age: 86400 * 60),
         %User{} = user <- Accounts.get_user!(user_id),
         true <- check_function.(conn, user) do
      assign(conn, :current_user, user)
    else
      _ ->
        conn
        |> put_status(:unauthorized)
        |> Phoenix.Controller.json(%{error: %{message: "Unauthorized"}})
        |> halt()
    end
  end

  defp has_simple_permission?(user, required_role) do
    # --- DEBUGGING LINES ---
    # These lines will print the values to your console during the test run.
    IO.inspect(user.role, label: "User Role")
    IO.inspect(required_role, label: "Required Role")
    # --- END DEBUGGING ---
    result =
      case {user.role, required_role} do
        # An admin user is always authorized.
        {"admin", _} -> true
        # If the route allows "any" authenticated user.
        {_, :any} -> true
        # If the user's role matches the required role.
        {role, role} -> true
        # In all other cases, deny access.
        _ -> false
      end

    # --- DEBUGGING LINE ---
    IO.inspect(result, label: "Permission Result")
    # --- END DEBUGGING ---

    result
  end
end
