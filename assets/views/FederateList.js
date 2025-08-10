import { request } from "../services/api.js";

const FederateList = {
	federates: [],
	error: "",
	oninit: () => {
		request({
			method: "GET",
			url: `/federates`,
		})
			.then((result) => {
				FederateList.federates = result.data;
			})
			.catch((err) => {
				FederateList.error =
					"No se pudieron cargar los federados.";
			});
	},
	view: () =>
		m(".container.mx-auto", [
			m(".flex.justify-between.items-center.mb-6", [
				m("h2.text-3xl.font-bold", "Federados"),
				m(
					"a.bg-green-500.hover:bg-green-600.text-white.py-2.px-4.rounded.transition-all",
					{ href: "#!/federados/nuevo" },
					"Crear Nuevo",
				),
			]),
			FederateList.error &&
			m(".text-red-500", FederateList.error),
			m(
				".bg-white.shadow-md.rounded-lg.overflow-x-auto",
				m("table.min-w-full.divide-y.divide-gray-200", [
					m(
						"thead.bg-gray-50",
						m("tr", [
							m(
								"th.px-6.py-3.text-left.text-xs.font-medium.text-gray-500.uppercase.tracking-wider",
								"Nombre",
							),
							m(
								"th.px-6.py-3.text-left.text-xs.font-medium.text-gray-500.uppercase.tracking-wider",
								"DNI",
							),
							m(
								"th.px-6.py-3.text-left.text-xs.font-medium.text-gray-500.uppercase.tracking-wider",
								"Estado",
							),
						]),
					),
					m(
						"tbody.bg-white.divide-y.divide-gray-200",
						FederateList.federates.map(
							(f) => m(
								"tr.hover:bg-gray-50",
								[
									m(
										"td.px-6.py-4.whitespace-nowrap",
										`${f.first_name} ${f.last_name}`,
									),
									m(
										"td.px-6.py-4.whitespace-nowrap",
										f.id_number,
									),
									m(
										"td.px-6.py-4.whitespace-nowrap",
										m(
											"span.px-2.inline-flex.text-xs.leading-5.font-semibold.rounded-full",
											{
												class: f.status ===
													"activo"
													? "bg-green-100 text-green-800"
													: "bg-red-100 text-red-800",
											},
											f.status,
										),
									),
								],
							),
						),
					),
				]),
			),
		]),
};

export default FederateList;
