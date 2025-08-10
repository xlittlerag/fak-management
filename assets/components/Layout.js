import { Auth } from "../services/api.js";

const Layout = {
	view: (vnode) =>
		m("div.min-h-screen.flex.flex-col", [
			m(
				"nav.bg-white.shadow-md.p-4.flex.justify-between.items-center",
				[
					m("div.flex.items-center.space-x-8", [
						m(
							"h1.text-xl.font-bold.text-gray-900",
							"Admin Kendo",
						),
						Auth.isAdmin() &&
						m("div.flex.space-x-4", [
							m("a", {
								href: "#!/federados",
								class: m.route
									.get().startsWith(
										"/federados",
									)
									? "nav-link-active"
									: "text-gray-500 hover:text-gray-800",
							}, "Federados"),
							m("a", {
								href: "#!/asociaciones",
								class: m.route
									.get().startsWith(
										"/asociaciones",
									)
									? "nav-link-active"
									: "text-gray-500 hover:text-gray-800",
							}, "Asociaciones"),
						]),
					]),
					Auth.isAuthenticated() &&
					m(
						"button.bg-red-500.hover:bg-red-600.text-white.py-2.px-4.rounded.transition-all",
						{
							onclick: Auth.logout,
						},
						"Cerrar Sesión",
					),
				],
			),
			m("main.flex-grow.p-4.md:p-8", vnode.children),
		]),
};

export default Layout;
