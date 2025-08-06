defmodule ApiWeb.Authorizer do
  alias Api.Federations

  @doc """
  Checks if the current user has permission to view a specific federate's profile.
  """
  def can_access_federate?(conn, current_user) do
    # Get the ID of the federate being requested from the URL parameters
    requested_federate_id = conn.params["id"]

    case current_user.role do
      # Admins can see any profile.
      :admin ->
        true

      # A regular federate can only see their own profile.
      :federate ->
        # Note: Elixir's type-safe comparison will not equate integer 1 and string "1"
        to_string(current_user.federate_id) == requested_federate_id

      # An approved federate can see any profile within their own association.
      :approved_federate ->
        case Federations.get_federate(requested_federate_id) do
          # Requested federate doesn't exist
          nil -> false
          federate -> federate.association_id == current_user.association_id
        end

      # Deny by default.
      _ ->
        false
    end
  end
end
