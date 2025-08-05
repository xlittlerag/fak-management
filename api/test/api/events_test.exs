defmodule Api.EventsTest do
  use Api.DataCase

  alias Api.Events

  describe "events" do
    alias Api.Events.Event

    import Api.EventsFixtures

    @invalid_attrs %{name: nil, description: nil, event_date: nil, cost: nil, capacity: nil}

    test "list_events/0 returns all events" do
      event = event_fixture()
      assert Events.list_events() == [event]
    end

    test "get_event!/1 returns the event with given id" do
      event = event_fixture()
      assert Events.get_event!(event.id) == event
    end

    test "create_event/1 with valid data creates a event" do
      valid_attrs = %{name: "some name", description: "some description", event_date: ~U[2025-08-03 02:15:00Z], cost: 120.5, capacity: 42}

      assert {:ok, %Event{} = event} = Events.create_event(valid_attrs)
      assert event.name == "some name"
      assert event.description == "some description"
      assert event.event_date == ~U[2025-08-03 02:15:00Z]
      assert event.cost == 120.5
      assert event.capacity == 42
    end

    test "create_event/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Events.create_event(@invalid_attrs)
    end

    test "update_event/2 with valid data updates the event" do
      event = event_fixture()
      update_attrs = %{name: "some updated name", description: "some updated description", event_date: ~U[2025-08-04 02:15:00Z], cost: 456.7, capacity: 43}

      assert {:ok, %Event{} = event} = Events.update_event(event, update_attrs)
      assert event.name == "some updated name"
      assert event.description == "some updated description"
      assert event.event_date == ~U[2025-08-04 02:15:00Z]
      assert event.cost == 456.7
      assert event.capacity == 43
    end

    test "update_event/2 with invalid data returns error changeset" do
      event = event_fixture()
      assert {:error, %Ecto.Changeset{}} = Events.update_event(event, @invalid_attrs)
      assert event == Events.get_event!(event.id)
    end

    test "delete_event/1 deletes the event" do
      event = event_fixture()
      assert {:ok, %Event{}} = Events.delete_event(event)
      assert_raise Ecto.NoResultsError, fn -> Events.get_event!(event.id) end
    end

    test "change_event/1 returns a event changeset" do
      event = event_fixture()
      assert %Ecto.Changeset{} = Events.change_event(event)
    end
  end

  describe "registrations" do
    alias Api.Events.Registration

    import Api.EventsFixtures

    @invalid_attrs %{status: nil}

    test "list_registrations/0 returns all registrations" do
      registration = registration_fixture()
      assert Events.list_registrations() == [registration]
    end

    test "get_registration!/1 returns the registration with given id" do
      registration = registration_fixture()
      assert Events.get_registration!(registration.id) == registration
    end

    test "create_registration/1 with valid data creates a registration" do
      valid_attrs = %{status: "some status"}

      assert {:ok, %Registration{} = registration} = Events.create_registration(valid_attrs)
      assert registration.status == "some status"
    end

    test "create_registration/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Events.create_registration(@invalid_attrs)
    end

    test "update_registration/2 with valid data updates the registration" do
      registration = registration_fixture()
      update_attrs = %{status: "some updated status"}

      assert {:ok, %Registration{} = registration} = Events.update_registration(registration, update_attrs)
      assert registration.status == "some updated status"
    end

    test "update_registration/2 with invalid data returns error changeset" do
      registration = registration_fixture()
      assert {:error, %Ecto.Changeset{}} = Events.update_registration(registration, @invalid_attrs)
      assert registration == Events.get_registration!(registration.id)
    end

    test "delete_registration/1 deletes the registration" do
      registration = registration_fixture()
      assert {:ok, %Registration{}} = Events.delete_registration(registration)
      assert_raise Ecto.NoResultsError, fn -> Events.get_registration!(registration.id) end
    end

    test "change_registration/1 returns a registration changeset" do
      registration = registration_fixture()
      assert %Ecto.Changeset{} = Events.change_registration(registration)
    end
  end
end
