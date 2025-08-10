defmodule Api.Repo.Migrations.CreatePayments do
  use Ecto.Migration

  def change do
    create table(:payments) do
      add :amount, :float
      add :status, :string
      add :mercadopago_id, :string
      add :payment_date, :utc_datetime
      add :federate_id, references(:federates, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:payments, [:federate_id])
  end
end
