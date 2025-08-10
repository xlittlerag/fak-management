defmodule Api.EventsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Api.Events` context.
  """

  @doc """
  Generate a event.
  """
  def event_fixture(attrs \\ %{}) do
    {:ok, event} =
      attrs
      |> Enum.into(%{
        capacity: 42,
        cost: 120.5,
        description: "some description",
        event_date: ~U[2025-08-03 02:15:00Z],
        name: "some name"
      })
      |> Api.Events.create_event()

    event
  end

  @doc """
  Generate a registration.
  """
  def registration_fixture(attrs \\ %{}) do
    {:ok, registration} =
      attrs
      |> Enum.into(%{
        status: "some status"
      })
      |> Api.Events.create_registration()

    registration
  end
end
