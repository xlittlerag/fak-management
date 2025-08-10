import { request } from "../services/api.js";

const AssociationNew = {
	name: "",
	error: "",
	success: "",
	loading: false,

	create: (e) => {
		e.preventDefault();
		AssociationNew.loading = true;
		AssociationNew.error = "";
		AssociationNew.success = "";

		request({
			method: "POST",
			url: `/associations`,
			body: { association: { name: AssociationNew.name } },
		})
			.then((result) => {
				AssociationNew.success =
					`¡Asociación "${result.data.name}" creada con éxito!`;
				AssociationNew.name = "";
				setTimeout(
					() => m.route.set("/asociaciones"),
					1500,
				);
			})
			.catch((err) => {
				AssociationNew.error =
					"La creación falló. El nombre puede que ya exista.";
			})
			.finally(() => {
				AssociationNew.loading = false;
				m.redraw();
			});
	},

	view: () =>
		m(".container.mx-auto.max-w-2xl", [
			m(
				"h2.text-3xl.font-bold.mb-6",
				"Crear Nueva Asociación",
			),
			m("form.bg-white.p-8.rounded-lg.shadow-lg", {
				onsubmit: AssociationNew.create,
			}, [
				AssociationNew.error &&
				m(
					".bg-red-100.border.border-red-400.text-red-700.px-4.py-3.rounded.relative.mb-4",
					AssociationNew.error,
				),
				AssociationNew.success &&
				m(
					".bg-green-100.border.border-green-400.text-green-700.px-4.py-3.rounded.relative.mb-4",
					AssociationNew.success,
				),
				m("div", [
					m(
						"label.block.text-gray-700.text-sm.font-bold.mb-2",
						"Nombre de la Asociación",
					),
					m("input.w-full.p-2.border.rounded", {
						oninput: (e) =>
							AssociationNew.name =
							e.target.value,
						value: AssociationNew.name,
						required: true,
					}),
				]),
				m(".mt-6.flex.justify-end.items-center", [
					m(
						"a.text-gray-600.hover:text-gray-800.mr-4",
						{ href: "#!/asociaciones" },
						"Cancelar",
					),
					m(
						"button.bg-blue-500.hover:bg-blue-700.text-white.font-bold.py-2.px-4.rounded.transition-all",
						{
							type: "submit",
							disabled: AssociationNew
								.loading,
						},
						AssociationNew.loading
							? "Creando..."
							: "Crear Asociación",
					),
				]),
			]),
		]),
};

export default AssociationNew;
