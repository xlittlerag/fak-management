defmodule Api.Federations.Association do
  use Ecto.Schema
  import Ecto.Changeset

  schema "associations" do
    field :name, :string

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(association, attrs) do
    association
    |> cast(attrs, [:name])
    |> validate_required([:name])
  end
end
