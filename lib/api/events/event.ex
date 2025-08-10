defmodule Api.Events.Event do
  use Ecto.Schema
  import Ecto.Changeset

  schema "events" do
    field :name, :string
    field :description, :string
    field :event_date, :utc_datetime
    field :cost, :float
    field :capacity, :integer

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(event, attrs) do
    event
    |> cast(attrs, [:name, :description, :event_date, :cost, :capacity])
    |> validate_required([:name, :description, :event_date, :cost, :capacity])
  end
end
