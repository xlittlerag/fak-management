defmodule Api.AccountsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Api.Accounts` context.
  """

  @doc """
  Generate a unique user username.
  """
  def unique_user_username, do: "user#{System.unique_integer([:positive])}"

  @doc """
  Generate a user.
  """
  def user_fixture(attrs \\ %{}) do
    {:ok, user} =
      attrs
      |> Enum.into(%{
        username: unique_user_username(),
        password: attrs[:password] || "supersecret",
        # Default role
        role: "federate"
      })
      |> Api.Accounts.register_user()

    user
  end

  @doc """
  Generate an admin user.
  """
  def admin_user_fixture(attrs \\ %{}) do
    # Create a user and explicitly set the role to "admin"
    user_fixture(Map.put(attrs, :role, "admin"))
  end
end
