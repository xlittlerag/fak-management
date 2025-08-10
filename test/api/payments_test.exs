defmodule Api.PaymentsTest do
  use Api.DataCase

  alias Api.Payments

  describe "payments" do
    alias Api.Payments.Payment

    import Api.PaymentsFixtures

    @invalid_attrs %{status: nil, amount: nil, mercadopago_id: nil, payment_date: nil}

    test "list_payments/0 returns all payments" do
      payment = payment_fixture()
      assert Payments.list_payments() == [payment]
    end

    test "get_payment!/1 returns the payment with given id" do
      payment = payment_fixture()
      assert Payments.get_payment!(payment.id) == payment
    end

    test "create_payment/1 with valid data creates a payment" do
      valid_attrs = %{status: "some status", amount: 120.5, mercadopago_id: "some mercadopago_id", payment_date: ~U[2025-08-03 02:16:00Z]}

      assert {:ok, %Payment{} = payment} = Payments.create_payment(valid_attrs)
      assert payment.status == "some status"
      assert payment.amount == 120.5
      assert payment.mercadopago_id == "some mercadopago_id"
      assert payment.payment_date == ~U[2025-08-03 02:16:00Z]
    end

    test "create_payment/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Payments.create_payment(@invalid_attrs)
    end

    test "update_payment/2 with valid data updates the payment" do
      payment = payment_fixture()
      update_attrs = %{status: "some updated status", amount: 456.7, mercadopago_id: "some updated mercadopago_id", payment_date: ~U[2025-08-04 02:16:00Z]}

      assert {:ok, %Payment{} = payment} = Payments.update_payment(payment, update_attrs)
      assert payment.status == "some updated status"
      assert payment.amount == 456.7
      assert payment.mercadopago_id == "some updated mercadopago_id"
      assert payment.payment_date == ~U[2025-08-04 02:16:00Z]
    end

    test "update_payment/2 with invalid data returns error changeset" do
      payment = payment_fixture()
      assert {:error, %Ecto.Changeset{}} = Payments.update_payment(payment, @invalid_attrs)
      assert payment == Payments.get_payment!(payment.id)
    end

    test "delete_payment/1 deletes the payment" do
      payment = payment_fixture()
      assert {:ok, %Payment{}} = Payments.delete_payment(payment)
      assert_raise Ecto.NoResultsError, fn -> Payments.get_payment!(payment.id) end
    end

    test "change_payment/1 returns a payment changeset" do
      payment = payment_fixture()
      assert %Ecto.Changeset{} = Payments.change_payment(payment)
    end
  end
end
