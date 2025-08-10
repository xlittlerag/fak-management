import { Auth } from "../services/api.js";

const Login = {
	username: "",
	password: "",
	error: "",
	loading: false,

	oninit: () => {
		Auth.loadSession();
		if (Auth.isAuthenticated() && Auth.isAdmin()) {
			m.route.set("/federados");
		}
	},

	login: (e) => {
		e.preventDefault();
		Login.loading = true;
		Login.error = "";
		Auth.login(Login.username, Login.password)
			.catch((err) => {
				Login.error =
					"Usuario o contraseña incorrectos.";
			})
			.finally(() => {
				Login.loading = false;
				m.redraw();
			});
	},

	view: () =>
		m(
			".flex.items-center.justify-center.h-full",
			m(
				"form.bg-white.p-8.rounded-lg.shadow-lg.w-full.max-w-sm",
				{ onsubmit: Login.login },
				[
					m(
						"h2.text-2xl.font-bold.mb-6.text-center",
						"Inicio de Sesión",
					),
					Login.error &&
					m(
						".bg-red-100.border.border-red-400.text-red-700.px-4.py-3.rounded.relative.mb-4",
						Login.error,
					),
					m(".mb-4", [
						m(
							"label.block.text-gray-700.text-sm.font-bold.mb-2[for=username]",
							"Usuario",
						),
						m(
							"input.shadow.appearance-none.border.rounded.w-full.py-2.px-3.text-gray-700.leading-tight.focus:outline-none.focus:shadow-outline#username",
							{
								type: "text",
								oninput: (e) =>
									Login.username =
									e.target.value,
								value: Login
									.username,
							},
						),
					]),
					m(".mb-6", [
						m(
							"label.block.text-gray-700.text-sm.font-bold.mb-2[for=password]",
							"Contraseña",
						),
						m(
							"input.shadow.appearance-none.border.rounded.w-full.py-2.px-3.text-gray-700.mb-3.leading-tight.focus:outline-none.focus:shadow-outline#password",
							{
								type: "password",
								oninput: (e) =>
									Login.password =
									e.target.value,
								value: Login
									.password,
							},
						),
					]),
					m(
						"button.bg-blue-500.hover:bg-blue-700.text-white.font-bold.py-2.px-4.rounded.w-full.focus:outline-none.focus:shadow-outline.transition-all",
						{
							type: "submit",
							disabled: Login.loading,
						},
						Login.loading
							? "Ingresando..."
							: "Ingresar",
					),
				],
			),
		),
};

export default Login;
