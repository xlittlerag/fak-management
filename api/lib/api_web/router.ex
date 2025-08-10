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

    # --- Protected API Routes ---
    scope "/" do
      pipe_through [:login_required]

      get "/events", EventController, :index
      put "/accounts/me/update-password", AccountController, :update_password

      scope "/" do
        pipe_through [:federate_access]

        get "/federates/:id", FederateController, :show
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

        get "/associations/me", AssociationController, :show_me
      end
    end
  end
end
