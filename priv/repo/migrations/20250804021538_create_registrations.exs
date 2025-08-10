defmodule Api.Repo.Migrations.CreateRegistrations do
  use Ecto.Migration

  def change do
    create table(:registrations) do
      add :status, :string
      add :federate_id, references(:federates, on_delete: :nothing)
      add :event_id, references(:events, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:registrations, [:federate_id])
    create index(:registrations, [:event_id])
  end
end
