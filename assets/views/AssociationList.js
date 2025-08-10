import { request } from "../services/api.js";

const AssociationList = {
	associations: [],
	error: "",
	oninit: () => {
		request({
			method: "GET",
			url: `/associations`,
		})
			.then((result) => {
				AssociationList.associations = result.data;
			})
			.catch((err) => {
				AssociationList.error =
					"No se pudieron cargar las asociaciones.";
			});
	},
	view: () =>
		m(".container.mx-auto", [
			m(".flex.justify-between.items-center.mb-6", [
				m("h2.text-3xl.font-bold", "Asociaciones"),
				m(
					"a.bg-green-500.hover:bg-green-600.text-white.py-2.px-4.rounded.transition-all",
					{ href: "#!/asociaciones/nueva" },
					"Crear Nueva",
				),
			]),
			AssociationList.error &&
			m(".text-red-500", AssociationList.error),
			m(
				".bg-white.shadow-md.rounded-lg",
				m("table.min-w-full.divide-y.divide-gray-200", [
					m(
						"thead.bg-gray-50",
						m("tr", [
							m(
								"th.px-6.py-3.text-left.text-xs.font-medium.text-gray-500.uppercase.tracking-wider",
								"ID",
							),
							m(
								"th.px-6.py-3.text-left.text-xs.font-medium.text-gray-500.uppercase.tracking-wider",
								"Nombre",
							),
						]),
					),
					m(
						"tbody.bg-white.divide-y.divide-gray-200",
						AssociationList.associations
							.map((a) =>
								m(
									"tr.hover:bg-gray-50",
									[
										m(
											"td.px-6.py-4.whitespace-nowrap",
											a.id,
										),
										m(
											"td.px-6.py-4.whitespace-nowrap",
											a.name,
										),
									],
								)
							),
					),
				]),
			),
		]),
};

export default AssociationList;
