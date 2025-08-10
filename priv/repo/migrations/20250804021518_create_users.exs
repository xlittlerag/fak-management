defmodule Api.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users) do
      add :username, :string
      add :password_hash, :string
      add :role, :string
      add :federate_id, references(:federates, on_delete: :nothing)
      add :association_id, references(:associations, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:users, [:federate_id])
    create index(:users, [:association_id])
  end
end
