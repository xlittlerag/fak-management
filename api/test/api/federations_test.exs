defmodule Api.FederationsTest do
  use Api.DataCase

  alias Api.Federations

  describe "associations" do
    alias Api.Federations.Association

    import Api.FederationsFixtures

    @invalid_attrs %{name: nil}

    test "list_associations/0 returns all associations" do
      association = association_fixture()
      assert Federations.list_associations() == [association]
    end

    test "get_association!/1 returns the association with given id" do
      association = association_fixture()
      assert Federations.get_association!(association.id) == association
    end

    test "create_association/1 with valid data creates a association" do
      valid_attrs = %{name: "some name"}

      assert {:ok, %Association{} = association} = Federations.create_association(valid_attrs)
      assert association.name == "some name"
    end

    test "create_association/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Federations.create_association(@invalid_attrs)
    end

    test "update_association/2 with valid data updates the association" do
      association = association_fixture()
      update_attrs = %{name: "some updated name"}

      assert {:ok, %Association{} = association} =
               Federations.update_association(association, update_attrs)

      assert association.name == "some updated name"
    end

    test "update_association/2 with invalid data returns error changeset" do
      association = association_fixture()

      assert {:error, %Ecto.Changeset{}} =
               Federations.update_association(association, @invalid_attrs)

      assert association == Federations.get_association!(association.id)
    end

    test "delete_association/1 deletes the association" do
      association = association_fixture()
      assert {:ok, %Association{}} = Federations.delete_association(association)
      assert_raise Ecto.NoResultsError, fn -> Federations.get_association!(association.id) end
    end

    test "change_association/1 returns a association changeset" do
      association = association_fixture()
      assert %Ecto.Changeset{} = Federations.change_association(association)
    end
  end

  describe "federates" do
    alias Api.Federations.Federate

    import Api.FederationsFixtures

    @invalid_attrs %{
      status: nil,
      id_number: nil,
      first_name: nil,
      last_name: nil,
      debt_amount: nil
    }

    test "list_federates/0 returns all federates" do
      federate = federate_fixture()
      assert Federations.list_federates() == [federate]
    end

    test "get_federate/1 returns the federate with given id" do
      federate = federate_fixture()
      assert Federations.get_federate(federate.id) == federate
    end

    test "create_federate/1 with valid data creates a federate" do
      valid_attrs = %{
        status: "some status",
        id_number: "some id_number",
        first_name: "some first_name",
        last_name: "some last_name",
        debt_amount: 120.5
      }

      assert {:ok, %Federate{} = federate} = Federations.create_federate(valid_attrs)
      assert federate.status == "some status"
      assert federate.id_number == "some id_number"
      assert federate.first_name == "some first_name"
      assert federate.last_name == "some last_name"
      assert federate.debt_amount == 120.5
    end

    test "create_federate/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Federations.create_federate(@invalid_attrs)
    end

    test "update_federate/2 with valid data updates the federate" do
      federate = federate_fixture()

      update_attrs = %{
        status: "some updated status",
        id_number: "some updated id_number",
        first_name: "some updated first_name",
        last_name: "some updated last_name",
        debt_amount: 456.7
      }

      assert {:ok, %Federate{} = federate} = Federations.update_federate(federate, update_attrs)
      assert federate.status == "some updated status"
      assert federate.id_number == "some updated id_number"
      assert federate.first_name == "some updated first_name"
      assert federate.last_name == "some updated last_name"
      assert federate.debt_amount == 456.7
    end

    test "update_federate/2 with invalid data returns error changeset" do
      federate = federate_fixture()
      assert {:error, %Ecto.Changeset{}} = Federations.update_federate(federate, @invalid_attrs)
      assert federate == Federations.get_federate(federate.id)
    end

    test "delete_federate/1 deletes the federate" do
      federate = federate_fixture()
      assert {:ok, %Federate{}} = Federations.delete_federate(federate)
      assert is_nil(Federations.get_federate(federate.id))
    end

    test "change_federate/1 returns a federate changeset" do
      federate = federate_fixture()
      assert %Ecto.Changeset{} = Federations.change_federate(federate)
    end
  end
end
