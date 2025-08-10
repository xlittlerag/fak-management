defmodule Api.Repo.Migrations.CreateEvents do
  use Ecto.Migration

  def change do
    create table(:events) do
      add :name, :string
      add :description, :string
      add :event_date, :utc_datetime
      add :cost, :float
      add :capacity, :integer

      timestamps(type: :utc_datetime)
    end
  end
end
