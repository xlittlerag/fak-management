defmodule Api.AccountsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Api.Accounts` context.
  """

  alias Api.FederationsFixtures

  @doc """
  Generate a unique user username.
  """
  def unique_user_username, do: "user#{System.unique_integer([:positive])}"

  @doc """
  Generate a "federate" user, linked to a specific federate profile.
  """
  def user_fixture(attrs \\ %{}) do
    # A "federate" user must be linked to a federate entity.
    # We create one if not provided.
    federate = attrs[:federate] || FederationsFixtures.federate_fixture()

    {:ok, user} =
      attrs
      |> Enum.into(%{
        username: unique_user_username(),
        password: attrs[:password] || "supersecret",
        role: "federate",
        federate_id: federate.id
      })
      |> Api.Accounts.register_user()

    user
  end

  @doc """
  Generate an "admin" user. Admins are not linked to any specific entity.
  """
  def admin_user_fixture(attrs \\ %{}) do
    {:ok, admin} =
      attrs
      |> Enum.into(%{
        username: unique_user_username(),
        password: attrs[:password] || "supersecret",
        role: "admin"
      })
      |> Api.Accounts.register_user()

    admin
  end

  @doc """
  Generate an "approved_federate" user, linked to a specific association.
  """
  def approved_federate_fixture(attrs \\ %{}) do
    # An "approved_federate" user must be linked to an association.
    association = attrs[:association] || FederationsFixtures.association_fixture()

    user_fixture(
      Map.merge(attrs, %{
        role: "approved_federate",
        association_id: association.id,
        federate_id: nil
      })
    )
  end
end
