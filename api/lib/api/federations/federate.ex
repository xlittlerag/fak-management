defmodule Api.Federations.Federate do
  use Ecto.Schema
  import Ecto.Changeset

  schema "federates" do
    field :status, :string
    field :id_number, :string
    field :first_name, :string
    field :last_name, :string
    field :debt_amount, :float
    field :association_id, :id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(federate, attrs) do
    federate
    |> cast(attrs, [:id_number, :first_name, :last_name, :status, :debt_amount])
    |> validate_required([:id_number, :first_name, :last_name, :status, :debt_amount])
  end
end
