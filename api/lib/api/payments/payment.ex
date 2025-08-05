defmodule Api.Payments.Payment do
  use Ecto.Schema
  import Ecto.Changeset

  schema "payments" do
    field :status, :string
    field :amount, :float
    field :mercadopago_id, :string
    field :payment_date, :utc_datetime
    field :federate_id, :id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(payment, attrs) do
    payment
    |> cast(attrs, [:amount, :status, :mercadopago_id, :payment_date])
    |> validate_required([:amount, :status, :mercadopago_id, :payment_date])
  end
end
