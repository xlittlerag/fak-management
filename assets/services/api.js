const API_BASE_URL = "http://localhost:4000/api";

export const Auth = {
	token: localStorage.getItem("auth_token"),
	user: JSON.parse(localStorage.getItem("auth_user")),

	login: (username, password) => {
		return m.request({
			method: "POST",
			url: `${API_BASE_URL}/login`,
			body: { username, password },
		}).then((result) => {
			Auth.token = result.jwt;
			Auth.user = result.user;
			localStorage.setItem("auth_token", Auth.token);
			localStorage.setItem(
				"auth_user",
				JSON.stringify(Auth.user),
			);
			m.route.set("/federados");
		});
	},

	logout: () => {
		Auth.token = null;
		Auth.user = null;
		localStorage.removeItem("auth_token");
		localStorage.removeItem("auth_user");
		m.route.set("/login");
	},

	isAuthenticated: () => !!Auth.token,
	isAdmin: () => Auth.user && Auth.user.role === "admin",

	loadSession: () => {
		Auth.token = localStorage.getItem("auth_token");
		Auth.user = JSON.parse(localStorage.getItem("auth_user"));
	},
};

export const request = (options) => {
	const extendedOptions = {
		...options,
		url: `${API_BASE_URL}${options.url}`,
		headers: {
			...options.headers,
			"Authorization": `Bearer ${Auth.token}`,
		},
	};
	return m.request(extendedOptions);
};
