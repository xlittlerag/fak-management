defmodule Api.Events.Registration do
  use Ecto.Schema
  import Ecto.Changeset

  schema "registrations" do
    field :status, :string
    field :federate_id, :id
    field :event_id, :id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(registration, attrs) do
    registration
    |> cast(attrs, [:status])
    |> validate_required([:status])
  end
end
