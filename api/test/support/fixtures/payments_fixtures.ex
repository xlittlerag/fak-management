defmodule Api.PaymentsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Api.Payments` context.
  """

  @doc """
  Generate a payment.
  """
  def payment_fixture(attrs \\ %{}) do
    {:ok, payment} =
      attrs
      |> Enum.into(%{
        amount: 120.5,
        mercadopago_id: "some mercadopago_id",
        payment_date: ~U[2025-08-03 02:16:00Z],
        status: "some status"
      })
      |> Api.Payments.create_payment()

    payment
  end
end
