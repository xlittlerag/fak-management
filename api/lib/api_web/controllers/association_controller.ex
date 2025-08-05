defmodule ApiWeb.AssociationController do
  use ApiWeb, :controller

  alias Api.Federations
  alias Api.Federations.Association

  action_fallback ApiWeb.FallbackController

  def index(conn, _params) do
    associations = Federations.list_associations()
    json(conn, %{data: associations})
  end

  def create(conn, %{"association" => association_params}) do
    with {:ok, %Association{} = association} <- Federations.create_association(association_params) do
      conn
      |> put_status(:created)
      |> json(%{data: association})
    else
      # If creation fails, pass the changeset to the fallback controller.
      {:error, %Ecto.Changeset{} = changeset} ->
        {:error, changeset}
    end
  end

  def update(conn, %{"id" => id, "association" => association_params}) do
    # First, we get the association to ensure it exists.
    case Federations.get_association!(id) do
      nil ->
        # If it doesn't exist, we return a 404 Not Found error.
        {:error, :not_found}

      association ->
        # If it exists, we attempt to update it.
        with {:ok, %Association{} = updated_association} <-
               Federations.update_association(association, association_params) do
          json(conn, %{data: updated_association})
        else
          {:error, %Ecto.Changeset{} = changeset} ->
            {:error, changeset}
        end
    end
  end
end
