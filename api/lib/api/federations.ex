defmodule Api.Federations do
  @moduledoc """
  The Federations context.
  """

  import Ecto.Query, warn: false
  alias Api.Repo

  alias Api.Federations.Association

  @doc """
  Returns the list of associations.

  ## Examples

      iex> list_associations()
      [%Association{}, ...]

  """
  def list_associations do
    Repo.all(Association)
  end

  @doc """
  Gets a single association.

  Raises `Ecto.NoResultsError` if the Association does not exist.

  ## Examples

      iex> get_association!(123)
      %Association{}

      iex> get_association!(456)
      ** (Ecto.NoResultsError)

  """
  def get_association!(id), do: Repo.get!(Association, id)

  @doc """
  Creates a association.

  ## Examples

      iex> create_association(%{field: value})
      {:ok, %Association{}}

      iex> create_association(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_association(attrs \\ %{}) do
    %Association{}
    |> Association.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a association.

  ## Examples

      iex> update_association(association, %{field: new_value})
      {:ok, %Association{}}

      iex> update_association(association, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_association(%Association{} = association, attrs) do
    association
    |> Association.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a association.

  ## Examples

      iex> delete_association(association)
      {:ok, %Association{}}

      iex> delete_association(association)
      {:error, %Ecto.Changeset{}}

  """
  def delete_association(%Association{} = association) do
    Repo.delete(association)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking association changes.

  ## Examples

      iex> change_association(association)
      %Ecto.Changeset{data: %Association{}}

  """
  def change_association(%Association{} = association, attrs \\ %{}) do
    Association.changeset(association, attrs)
  end

  alias Api.Federations.Federate

  @doc """
  Returns the list of federates.

  ## Examples

      iex> list_federates()
      [%Federate{}, ...]

  """
  def list_federates do
    Repo.all(Federate)
  end

  @doc """
  Gets a single federate.

  Raises `Ecto.NoResultsError` if the Federate does not exist.

  ## Examples

      iex> get_federate!(123)
      %Federate{}

      iex> get_federate!(456)
      ** (Ecto.NoResultsError)

  """
  def get_federate!(id), do: Repo.get!(Federate, id)

  @doc """
  Creates a federate.

  ## Examples

      iex> create_federate(%{field: value})
      {:ok, %Federate{}}

      iex> create_federate(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_federate(attrs \\ %{}) do
    %Federate{}
    |> Federate.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a federate.

  ## Examples

      iex> update_federate(federate, %{field: new_value})
      {:ok, %Federate{}}

      iex> update_federate(federate, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_federate(%Federate{} = federate, attrs) do
    federate
    |> Federate.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a federate.

  ## Examples

      iex> delete_federate(federate)
      {:ok, %Federate{}}

      iex> delete_federate(federate)
      {:error, %Ecto.Changeset{}}

  """
  def delete_federate(%Federate{} = federate) do
    Repo.delete(federate)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking federate changes.

  ## Examples

      iex> change_federate(federate)
      %Ecto.Changeset{data: %Federate{}}

  """
  def change_federate(%Federate{} = federate, attrs \\ %{}) do
    Federate.changeset(federate, attrs)
  end
end
