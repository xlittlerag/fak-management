defmodule Api.Repo.Migrations.CreateFederates do
  use Ecto.Migration

  def change do
    create table(:federates) do
      add :id_number, :string
      add :first_name, :string
      add :last_name, :string
      add :status, :string
      add :debt_amount, :float
      add :association_id, references(:associations, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:federates, [:association_id])
  end
end
