import { request } from "../services/api.js";

const FederateNew = {
	first_name: "",
	last_name: "",
	id_number: "",
	associations: [],
	association_id: "",
	error: "",
	success: "",
	loading: false,

	oninit: () => {
		request({
			method: "GET",
			url: `/associations`,
		})
			.then((result) => {
				FederateNew.associations = result.data;
				if (FederateNew.associations.length > 0) {
					FederateNew.association_id =
						FederateNew.associations[0].id;
				}
			})
			.catch((err) => {
				FederateNew.error =
					"No se pudieron cargar las asociaciones.";
			});
	},

	create: (e) => {
		e.preventDefault();
		FederateNew.loading = true;
		FederateNew.error = "";
		FederateNew.success = "";

		const federateData = {
			first_name: FederateNew.first_name,
			last_name: FederateNew.last_name,
			id_number: FederateNew.id_number,
			association_id: parseInt(
				FederateNew.association_id,
				10,
			),
		};

		request({
			method: "POST",
			url: `/federates`,
			body: { federate: federateData },
		})
			.then((result) => {
				FederateNew.success =
					`¡Federado creado! Contraseña Generada: ${result.generated_password}`;
				FederateNew.first_name = "";
				FederateNew.last_name = "";
				FederateNew.id_number = "";
			})
			.catch((err) => {
				FederateNew.error =
					"La creación falló. Por favor, revise los campos.";
			})
			.finally(() => {
				FederateNew.loading = false;
				m.redraw();
			});
	},

	view: () =>
		m(".container.mx-auto.max-w-2xl", [
			m("h2.text-3xl.font-bold.mb-6", "Crear Nuevo Federado"),
			m("form.bg-white.p-8.rounded-lg.shadow-lg", {
				onsubmit: FederateNew.create,
			}, [
				FederateNew.error &&
				m(
					".bg-red-100.border.border-red-400.text-red-700.px-4.py-3.rounded.relative.mb-4",
					FederateNew.error,
				),
				FederateNew.success &&
				m(
					".bg-green-100.border.border-green-400.text-green-700.px-4.py-3.rounded.relative.mb-4",
					FederateNew.success,
				),
				m(".grid.grid-cols-1.md:grid-cols-2.gap-6", [
					m("div", [
						m(
							"label.block.text-gray-700.text-sm.font-bold.mb-2",
							"Nombre",
						),
						m(
							"input.w-full.p-2.border.rounded",
							{
								oninput: (e) =>
									FederateNew
										.first_name =
									e.target.value,
								value: FederateNew
									.first_name,
								required: true,
							},
						),
					]),
					m("div", [
						m(
							"label.block.text-gray-700.text-sm.font-bold.mb-2",
							"Apellido",
						),
						m(
							"input.w-full.p-2.border.rounded",
							{
								oninput: (e) =>
									FederateNew
										.last_name =
									e.target.value,
								value: FederateNew
									.last_name,
								required: true,
							},
						),
					]),
					m("div", [
						m(
							"label.block.text-gray-700.text-sm.font-bold.mb-2",
							"DNI",
						),
						m(
							"input.w-full.p-2.border.rounded",
							{
								oninput: (e) =>
									FederateNew
										.id_number =
									e.target.value,
								value: FederateNew
									.id_number,
								required: true,
							},
						),
					]),
					m("div", [
						m(
							"label.block.text-gray-700.text-sm.font-bold.mb-2",
							"Asociación",
						),
						m(
							"select.w-full.p-2.border.rounded.bg-white",
							{
								onchange: (e) =>
									FederateNew
										.association_id =
									e.target.value,
								value: FederateNew
									.association_id,
								required: true,
							},
							FederateNew.associations
								.map((assoc) =>
									m(
										"option",
										{
											value: assoc
												.id,
										},
										assoc.name,
									)
								),
						),
					]),
				]),
				m(".mt-6.flex.justify-end.items-center", [
					m(
						"a.text-gray-600.hover:text-gray-800.mr-4",
						{ href: "#!/federados" },
						"Cancelar",
					),
					m(
						"button.bg-blue-500.hover:bg-blue-700.text-white.font-bold.py-2.px-4.rounded.transition-all",
						{
							type: "submit",
							disabled: FederateNew
								.loading,
						},
						FederateNew.loading
							? "Creando..."
							: "Crear Federado",
					),
				]),
			]),
		]),
};

export default FederateNew;
