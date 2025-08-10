alias Api.Accounts

admin_username = System.get_env("ADMIN_USERNAME")
admin_password = System.get_env("ADMIN_PASSWORD")

case Accounts.register_user(%{
       username: admin_username,
       password: admin_password,
       role: :admin
     }) do
  {:ok, _} -> IO.puts("✅ Admin user created successfully!")
  {:error, _} -> IO.puts("ℹ️ Admin user already exists.")
end
