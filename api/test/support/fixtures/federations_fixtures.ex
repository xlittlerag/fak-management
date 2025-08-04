defmodule Api.FederationsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Api.Federations` context.
  """

  @doc """
  Generate a association.
  """
  def association_fixture(attrs \\ %{}) do
    {:ok, association} =
      attrs
      |> Enum.into(%{
        name: "some name"
      })
      |> Api.Federations.create_association()

    association
  end

  @doc """
  Generate a federate.
  """
  def federate_fixture(attrs \\ %{}) do
    {:ok, federate} =
      attrs
      |> Enum.into(%{
        debt_amount: 120.5,
        first_name: "some first_name",
        id_number: "some id_number",
        last_name: "some last_name",
        status: "some status"
      })
      |> Api.Federations.create_federate()

    federate
  end
end
