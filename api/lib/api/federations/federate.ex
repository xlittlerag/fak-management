defmodule Api.Federations.Federate do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder,
           only: [
             :id,
             :first_name,
             :last_name,
             :id_number,
             :status,
             :debt_amount,
             :association_id
           ]}

  # TODO:Analyze whether it's necessary to have two IDs.
  schema "federates" do
    field :id_number, :string
    field :first_name, :string
    field :last_name, :string
    field :status, :string, default: "activo"
    field :debt_amount, :float, default: 0.0

    belongs_to :association, Api.Federations.Association
    timestamps()
  end

  @doc false
  def changeset(federate, attrs) do
    federate
    |> cast(attrs, [
      :id_number,
      :first_name,
      :last_name,
      :status,
      :debt_amount,
      :association_id
    ])
    |> validate_required([
      :id_number,
      :first_name,
      :last_name,
      :status,
      :debt_amount
    ])
  end
end
