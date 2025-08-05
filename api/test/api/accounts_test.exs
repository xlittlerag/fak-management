defmodule Api.AccountsTest do
  use Api.DataCase

  alias Api.Accounts
  alias Api.Accounts.User
  alias Api.AccountsFixtures

  describe "users" do
    test "get_user!/1 returns the user with given id" do
      user = AccountsFixtures.user_fixture()
      fetched_user = Accounts.get_user!(user.id)

      # The original test failed because `user` has a `password` field,
      # but `fetched_user` doesn't (it's a virtual field).
      # This is the correct way to assert they are the same user.
      assert fetched_user.id == user.id
      assert fetched_user.username == user.username
    end

    test "create_user/1 with valid data creates a user" do
      valid_attrs = %{
        username: "testuser",
        password: "valid_password",
        role: "federate"
      }

      assert {:ok, %User{} = user} = Accounts.register_user(valid_attrs)
      assert user.username == "testuser"
      assert user.role == "federate"
      assert user.password_hash
    end

    test "create_user/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Accounts.register_user(%{})
    end
  end
end
