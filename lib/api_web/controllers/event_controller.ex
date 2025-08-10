defmodule ApiWeb.EventController do
  use ApiWeb, :controller

  alias Api.Events

  action_fallback ApiWeb.FallbackController

  def index(conn, _params) do
    events = Events.list_events()
    json(conn, %{data: events})
  end
end
