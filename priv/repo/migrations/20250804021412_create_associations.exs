defmodule Api.Repo.Migrations.CreateAssociations do
  use Ecto.Migration

  def change do
    create table(:associations) do
      add :name, :string

      timestamps(type: :utc_datetime)
    end
  end
end
