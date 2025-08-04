defmodule ApiWeb.Router do
  use ApiWeb, :router

  # The :browser pipeline is no longer needed.
  # pipeline :browser do
  #   ...
  # end

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :api_protected do
    plug ApiWeb.Plugs.Authorize, :any
  end

  pipeline :api_admin_protected do
    plug ApiWeb.Plugs.Authorize, :admin
  end

  # The scope for browser routes is no longer needed.
  # scope "/", ApiWeb do
  #   pipe_through :browser
  #   get "/", PageController, :index
  # end

  # --- Public API Routes ---
  scope "/api", ApiWeb do
    pipe_through :api

    post "/login", SessionController, :create
  end

  # --- Protected API Routes ---
  scope "/api", ApiWeb do
    pipe_through [:api, :api_protected]

    get "/events", EventController, :index

    get "/federates/:id", FederateController, :show,
      plugs: [{ApiWeb.Plugs.Authorize, {ApiWeb.Authorizer, :can_access_federate?}}]
  end

  scope "/api", ApiWeb do
    pipe_through [:api, :api_admin_protected]

    get "/federates", FederateController, :index
  end

  # Dev routes can remain as they are useful for development.
  if Application.compile_env(:api, :dev_routes) do
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      # Note: The dashboard requires a browser, but it's a dev-only tool.
      pipe_through [:fetch_session, :protect_from_forgery]
      live_dashboard "/dashboard", metrics: ApiWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
