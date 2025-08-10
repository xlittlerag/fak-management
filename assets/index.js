import { Auth } from "./services/api.js";
import Layout from "./components/Layout.js";
import Login from "./views/Login.js";
import FederateList from "./views/FederateList.js";
import FederateNew from "./views/FederateNew.js";
import AssociationList from "./views/AssociationList.js";
import AssociationNew from "./views/AssociationNew.js";

const root = document.body;

// This component acts as a guard for routes that require admin access.
const AdminRoute = {
	oninit: () => {
		Auth.loadSession();
		if (!Auth.isAdmin()) {
			m.route.set("/login");
		}
	},
	view: (vnode) => {
		if (Auth.isAdmin()) {
			// If authorized, it renders the component passed to it (e.g., FederateList)
			return m(vnode.attrs.component);
		}
	},
};

// Define all the application routes
m.route(root, "/", {
	"/": {
		onmatch: () => {
			// When the app first loads, check auth and redirect.
			Auth.loadSession();
			if (Auth.isAdmin()) {
				m.route.set("/federados");
			} else {
				m.route.set("/login");
			}
		},
	},
	"/login": {
		render: () => m(Layout, m(Login)),
	},
	"/federados": {
		render: () =>
			m(Layout, m(AdminRoute, { component: FederateList })),
	},
	"/federados/nuevo": {
		render: () =>
			m(Layout, m(AdminRoute, { component: FederateNew })),
	},
	"/asociaciones": {
		render: () =>
			m(
				Layout,
				m(AdminRoute, { component: AssociationList }),
			),
	},
	"/asociaciones/nueva": {
		render: () =>
			m(Layout, m(AdminRoute, { component: AssociationNew })),
	},
});
