defmodule ApiWeb.Router do
  use ApiWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :login_required do
    plug ApiWeb.Plugs.Authorize, :any
  end

  pipeline :admin_required do
    plug ApiWeb.Plugs.Authorize, :admin
  end

  pipeline :federate_access do
    plug ApiWeb.Plugs.Authorize, {ApiWeb.Authorizer, :can_access_federate?}
  end

  pipeline :approved_federate_required do
    plug ApiWeb.Plugs.Authorize, :approved_federate
  end

  # --- Public API Routes ---
  scope "/api", ApiWeb do
    pipe_through :api

    post "/login", SessionController, :create
  end

  # --- Protected API Routes ---
  scope "/api", ApiWeb do
    pipe_through [:api]

    scope "/" do
      get "/events", EventController, :index

      scope "/" do
        pipe_through [:federate_access]

        get "/federates/:id", FederateController, :show
      end
    end

    scope "/" do
      pipe_through [:admin_required]

      scope "/federates" do
        get "/", FederateController, :index
        post "/", FederateController, :create
        put "/:id", FederateController, :update
      end

      scope "/associations" do
        get "/", AssociationController, :index
        post "/", AssociationController, :create
        put "/:id", AssociationController, :update
      end
    end

    scope "/" do
      pipe_through [:approved_federate_required]

      get "/associations/mine", AssociationController, :mine
    end
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
