defmodule Api.Accounts do
  @moduledoc """
  The Accounts context, handling user registration, authentication, and management.
  """

  import Ecto.Query, warn: false
  alias Api.Repo

  alias Api.Accounts.User
  alias Argon2

  @doc """
  Registers a new user.
  """
  def register_user(attrs) do
    %User{}
    |> User.changeset(attrs)
    # Cast the password separately as it's a virtual field
    |> Ecto.Changeset.cast(attrs, [:password])
    |> Ecto.Changeset.validate_required([:password])
    |> put_pass_hash()
    |> Repo.insert()
  end

  defp put_pass_hash(changeset) do
    case changeset do
      %Ecto.Changeset{valid?: true, changes: %{password: password}} ->
        # Hash the password and store it in the password_hash field
        Ecto.Changeset.put_change(changeset, :password_hash, Argon2.hash_pwd_salt(password))

      _ ->
        changeset
    end
  end

  @doc """
  Authenticates a user by username and password.

  Returns `{:ok, {jwt, user}}` on success, or `{:error, reason}` on failure.
  """
  def login_user(username, password) do
    case Repo.get_by(User, username: username) do
      %User{} = user ->
        case Argon2.verify_pass(password, user.password_hash) do
          true ->
            # Successful login, generate a token and return it with the user
            {:ok, {generate_token(user), user}}

          false ->
            # Invalid password
            {:error, :invalid_credentials}
        end

      nil ->
        # User not found. To prevent user enumeration attacks, we don't
        # reveal that the user doesn't exist. We hash a dummy password to
        # ensure the response time is similar to a failed login.
        Argon2.no_user_verify()
        {:error, :invalid_credentials}
    end
  end

  @doc """
  Verifies a JWT. Used in tests to confirm the token is valid.
  """
  def verify_token(token) do
    # Max age is set to 60 days in seconds
    Phoenix.Token.verify(ApiWeb.Endpoint, "user", token, max_age: 60 * 60 * 24 * 60)
  end

  @doc """
  Returns a user by their ID. Used by the Authorize plug.
  """
  def get_user!(id) do
    Repo.get(User, id)
  end

  defp generate_token(user) do
    # The token will be valid for 60 days.
    # It contains the user's ID, which we'll use to fetch the user on subsequent requests.
    Phoenix.Token.sign(ApiWeb.Endpoint, "user", %{user_id: user.id})
  end
end
