defmodule ApiWeb.FederateController do
  use ApiWeb, :controller

  alias Api.Federations

  action_fallback ApiWeb.FallbackController

  def index(conn, _params) do
    federates = Federations.list_federates()

    # Manually map the data to ensure we only expose the fields we want (not the password).
    data =
      Enum.map(federates, fn f ->
        %{
          id: f.id,
          first_name: f.first_name,
          last_name: f.last_name,
          id_number: f.id_number,
          status: f.status,
          debt_amount: f.debt_amount
        }
      end)

    json(conn, %{data: data})
  end

  def create(conn, %{"federate" => federate_params}) do
    with {:ok, %{federate: federate, password: password}} <-
           Federations.create_federate_with_user(federate_params) do
      conn
      |> put_status(:created)
      |> json(%{data: federate, generated_password: password})
    else
      {:error, changeset} ->
        {:error, changeset}
    end
  end

  def show(conn, %{"id" => id}) do
    case Federations.get_federate!(id) do
      nil ->
        json(conn, %{error: "Not found"})
        |> put_status(:not_found)

      federate ->
        json(conn, %{data: federate})
    end
  end
end
