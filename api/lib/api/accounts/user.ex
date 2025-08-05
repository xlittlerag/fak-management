defmodule Api.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder,
           only: [
             :id,
             :username,
             :role
           ]}

  schema "users" do
    field :username, :string
    field :password, :string, virtual: true
    field :password_hash, :string
    field :role, Ecto.Enum, values: [:admin, :approved_federate, :federate]

    belongs_to :federate, Api.Federations.Federate, foreign_key: :federate_id, type: :id
    belongs_to :association, Api.Federations.Association, foreign_key: :association_id, type: :id

    timestamps()
  end

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(attrs, [:username, :role, :federate_id, :association_id])
    |> validate_required([:username, :role])
    |> unique_constraint(:username)
  end
end
