defmodule Api.Federations do
  @moduledoc """
  The Federations context.
  """

  import Ecto.Query, warn: false
  alias Ecto.Multi
  alias Api.Repo

  alias Api.Federations.Association
  alias Api.Federations.Federate
  alias Api.Accounts

  @doc """
  Returns the list of associations.
  """
  def list_associations do
    Repo.all(Association)
  end

  @doc """
  Gets a single association.
  Raises `Ecto.NoResultsError` if the Association does not exist.
  """
  def get_association!(id), do: Repo.get!(Association, id)

  @doc """
  Creates a association.
  """
  def create_association(attrs \\ %{}) do
    %Association{}
    |> Association.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a association.
  """
  def update_association(%Association{} = association, attrs) do
    association
    |> Association.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a association.
  """
  def delete_association(%Association{} = association) do
    Repo.delete(association)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking association changes.
  """
  def change_association(%Association{} = association, attrs \\ %{}) do
    Association.changeset(association, attrs)
  end

  alias Api.Federations.Federate

  @doc """
  Returns the list of federates.
  """
  def list_federates do
    Repo.all(Federate)
  end

  @doc """
  Gets a single federate.
  Raises `Ecto.NoResultsError` if the Federate does not exist.
  """
  def get_federate!(id), do: Repo.get!(Federate, id)

  @doc """
  Creates a federate.
  """
  def create_federate(attrs \\ %{}) do
    %Federate{}
    |> Federate.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a federate.
  """
  def update_federate(%Federate{} = federate, attrs) do
    federate
    |> Federate.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a federate.
  """
  def delete_federate(%Federate{} = federate) do
    Repo.delete(federate)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking federate changes.
  """
  def change_federate(%Federate{} = federate, attrs \\ %{}) do
    Federate.changeset(federate, attrs)
  end

  def create_federate_with_user(attrs) do
    # Generate a secure, random password for the new user.
    password = :crypto.strong_rand_bytes(12) |> Base.encode64() |> String.slice(0..11)

    Multi.new()
    |> Multi.insert(:federate, Federate.changeset(%Federate{}, attrs))
    |> Multi.run(:user, fn _repo, %{federate: federate} ->
      # Use the federate's id_number as their username.
      user_attrs = %{
        username: federate.id_number,
        password: password,
        role: :federate,
        federate_id: federate.id
      }

      Accounts.register_user(user_attrs)
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{federate: federate, user: _user}} ->
        # On success, return the federate and the generated password.
        {:ok, %{federate: federate, password: password}}

      {:error, :federate, changeset, _} ->
        # If federate creation fails, return the changeset.
        {:error, changeset}

      {:error, :user, changeset, _} ->
        # If user creation fails, return that changeset.
        {:error, changeset}
    end
  end
end
