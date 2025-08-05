defmodule Api.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder,
           only: [
             :id,
             :username,
             :role
           ]}

  schema "users" do
    field :username, :string
    field :password_hash, :string
    field :role, Ecto.Enum, values: [:admin, :approved_federate, :federate]

    field :password, :string, virtual: true
    field :current_password, :string, virtual: true

    belongs_to :federate, Api.Federations.Federate, foreign_key: :federate_id, type: :id
    belongs_to :association, Api.Federations.Association, foreign_key: :association_id, type: :id

    timestamps()
  end

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(attrs, [:username, :role, :federate_id, :association_id])
    |> validate_required([:username, :role])
    |> validate_inclusion(:role, [:admin, :approved_federate, :federate])
    |> unique_constraint(:username)
  end

  @doc """
  A changeset for changing the user password.
  """
  def password_changeset(user, attrs) do
    user
    |> cast(attrs, [:current_password, :password])
    |> validate_required([:current_password, :password])
    |> validate_current_password(:current_password)
    |> put_pass_hash()
  end

  defp validate_current_password(changeset, field) do
    current_password = get_field(changeset, field)
    password_hash = changeset.data.password_hash

    if Argon2.verify_pass(current_password, password_hash) do
      changeset
    else
      add_error(changeset, field, "is invalid")
    end
  end

  defp put_pass_hash(changeset) do
    case changeset do
      %Ecto.Changeset{valid?: true, changes: %{password: password}} ->
        put_change(changeset, :password_hash, Argon2.hash_pwd_salt(password))

      _ ->
        changeset
    end
  end
end
