defmodule ApiWeb.FallbackController do
  @moduledoc """
  g Translates controller action results into valid JSON responses.
  """
  use ApiWeb, :controller

  # This clause handles cases where a changeset is returned from a controller action,
  # which typically means a validation error. It now renders JSON directly.
  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)})
  end

  # This clause handles a generic :not_found error.
  def call(conn, {:error, :not_found}) do
    conn
    |> put_status(:not_found)
    |> put_view(json: ApiWeb.ErrorJSON)
    |> render(:"404")
  end

  # This helper function can now live directly inside the FallbackController.
  defp translate_error({msg, opts}) do
    # When using gettext, we could translate this error message.
    # For now, we'll just format it.
    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", to_string(value))
    end)
  end
end
