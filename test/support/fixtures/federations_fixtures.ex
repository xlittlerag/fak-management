defmodule Api.FederationsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Api.Federations` context.
  """

  def unique_association_name, do: "Association #{System.unique_integer()}"

  def association_fixture(attrs \\ %{}) do
    {:ok, association} =
      attrs
      |> Enum.into(%{
        name: unique_association_name()
      })
      |> Api.Federations.create_association()

    association
  end

  def federate_fixture(attrs \\ %{}) do
    association = attrs[:association] || association_fixture()

    # The fix is to add the required fields that were missing.
    # We use the default values from your specification.
    {:ok, federate} =
      attrs
      |> Enum.into(%{
        first_name: "John",
        last_name: "Doe",
        id_number: to_string(System.unique_integer()),
        association_id: association.id,
        status: "activo",
        debt_amount: 0.0
      })
      |> Api.Federations.create_federate()

    federate
  end
end
