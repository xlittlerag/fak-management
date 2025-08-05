<script>
	import { onMount } from "svelte";

	const API_BASE_URL = "/api/federates";

	let federates = [];
	let federateId = null;

	// federate form fields
	let idNumber = "";
	let firstName = "";
	let lastName = "";
	let birthday = "";
	let status = "activo";

	// Activity flags and fields
	let hasKendo = false;
	let kendoLastExam = "";
	let kendoExamDate = "";
	let kendoExamCity = "";
	let kendoExamEmissor = "";

	let hasIaido = false;
	let iaidoLastExam = "";
	let iaidoExamDate = "";
	let iaidoExamCity = "";
	let iaidoExamEmissor = "";

	let hasJodo = false;
	let jodoLastExam = "";
	let jodoExamDate = "";
	let jodoExamCity = "";
	let jodoExamEmissor = "";

	// Form UI state
	let formTitle = "Registrar Nuevo Asociado";
	let submitButtonText = "Registrar Asociado";
	let showCancelEdit = false;

	// Array of valid exam levels for the dropdown
	const examLevels = [
		"3er Kyu",
		"2do Kyu",
		"1er Kyu",
		"1er Dan",
		"2do Dan",
		"3er Dan",
		"4to Dan",
		"5to Dan",
		"6to Dan",
		"7mo Dan",
		"8vo Dan",
	];

	// Helper to format date for display
	function formatDate(dateString) {
		if (!dateString) return "";
		const [year, month, day] = dateString.split("-");
		return `${month}/${day}/${year}`;
	}

	// Function to safely format status
	function formatStatus(statusString) {
		if (typeof statusString === "string" && statusString) {
			return statusString.replace("_", " ");
		}
		return "N/A";
	}

	// Function to fetch and display federates
	async function fetchfederates() {
		console.log("Intentando obtener asociados...");
		try {
			const response = await fetch(API_BASE_URL);
			if (!response.ok) {
				throw new Error(
					`Error HTTP! estado: ${response.status}`,
				);
			}
			const data = await response.json();
			federates = [...data];
			console.log("Datos de asociados obtenidos:", federates);
		} catch (error) {
			console.error("Error al obtener asociados:", error);
			alert(
				"Fallo al cargar asociados. Ver consola para detalles.",
			);
		}
	}

	// Function to handle form submission (Add/Update)
	async function handleSubmit() {
		const kendoRecord = hasKendo
			? {
					lastExam: kendoLastExam,
					examDate: kendoExamDate,
					examCity: kendoExamCity,
					examEmissor: kendoExamEmissor,
				}
			: null;

		const iaidoRecord = hasIaido
			? {
					lastExam: iaidoLastExam,
					examDate: iaidoExamDate,
					examCity: iaidoExamCity,
					examEmissor: iaidoExamEmissor,
				}
			: null;

		const jodoRecord = hasJodo
			? {
					lastExam: jodoLastExam,
					examDate: jodoExamDate,
					examCity: jodoExamCity,
					examEmissor: jodoExamEmissor,
				}
			: null;

		const federateData = {
			idNumber: idNumber,
			firstName: firstName,
			lastName: lastName,
			birthday: birthday,
			status: status,
			kendo: kendoRecord,
			iaido: iaidoRecord,
			jodo: jodoRecord,
		};

		try {
			console.log(
				"Enviando datos del asociado:",
				federateData,
			);
			let response;
			if (federateId) {
				response = await fetch(
					`${API_BASE_URL}/${federateId}`,
					{
						method: "PUT",
						headers: {
							"Content-Type":
								"application/json",
						},
						body: JSON.stringify(
							federateData,
						),
					},
				);
			} else {
				response = await fetch(API_BASE_URL, {
					method: "POST",
					headers: {
						"Content-Type":
							"application/json",
					},
					body: JSON.stringify(federateData),
				});
			}

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					`Error HTTP! estado: ${response.status}, mensaje: ${errorData.error || "Error desconocido"}`,
				);
			}

			resetForm();
			await fetchfederates();
			console.log(
				"Array de asociados después de guardar y obtener:",
				federates,
			);
		} catch (error) {
			console.error("Error al guardar asociado:", error);
			alert(
				`Fallo al guardar asociado: ${error.message}. Por favor, verifica tus datos.`,
			);
		}
	}

	// Function to populate form for editing
	async function editfederate(id) {
		try {
			const response = await fetch(`${API_BASE_URL}/${id}`);
			if (!response.ok) {
				throw new Error(
					`Error HTTP! estado: ${response.status}`,
				);
			}
			const federate = await response.json();

			federateId = federate.ID;
			idNumber = federate.idNumber;
			firstName = federate.firstName;
			lastName = federate.lastName;
			birthday = federate.birthday;
			status = federate.status;

			hasKendo = !!federate.kendo;
			kendoLastExam = federate.kendo?.lastExam || "";
			kendoExamDate = federate.kendo?.examDate || "";
			kendoExamCity = federate.kendo?.examCity || "";
			kendoExamEmissor = federate.kendo?.examEmissor || "";

			hasIaido = !!federate.iaido;
			iaidoLastExam = federate.iaido?.lastExam || "";
			iaidoExamDate = federate.iaido?.examDate || "";
			iaidoExamCity = federate.iaido?.examCity || "";
			iaidoExamEmissor = federate.iaido?.examEmissor || "";

			hasJodo = !!federate.jodo;
			jodoLastExam = federate.jodo?.lastExam || "";
			jodoExamDate = federate.jodo?.examDate || "";
			jodoExamCity = federate.jodo?.examCity || "";
			jodoExamEmissor = federate.jodo?.examEmissor || "";

			formTitle = "Editar Asociado";
			submitButtonText = "Actualizar Asociado";
			showCancelEdit = true;
		} catch (error) {
			console.error(
				"Error al obtener asociado para editar:",
				error,
			);
			alert(
				"Fallo al cargar asociado para editar. Ver consola para detalles.",
			);
		}
	}

	// Function to delete an federate
	async function deletefederate(id) {
		if (
			!confirm(
				"¿Estás seguro de que quieres eliminar a este asociado?",
			)
		) {
			return;
		}
		try {
			const response = await fetch(`${API_BASE_URL}/${id}`, {
				method: "DELETE",
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					`Error HTTP! estado: ${response.status}, mensaje: ${errorData.error || "Error desconocido"}`,
				);
			}
			await fetchfederates();
		} catch (error) {
			console.error("Error al eliminar asociado:", error);
			alert(`Fallo al eliminar asociado: ${error.message}.`);
		}
	}

	// Function to reset the form
	function resetForm() {
		federateId = null;
		idNumber = "";
		firstName = "";
		lastName = "";
		birthday = "";
		status = "activo";

		hasKendo = false;
		kendoLastExam = "";
		kendoExamDate = "";
		kendoExamCity = "";
		kendoExamEmissor = "";

		hasIaido = false;
		iaidoLastExam = "";
		iaidoExamDate = "";
		iaidoExamCity = "";
		iaidoExamEmissor = "";

		hasJodo = false;
		jodoLastExam = "";
		jodoExamDate = "";
		jodoExamCity = "";
		jodoExamEmissor = "";

		formTitle = "Registrar Nuevo Asociado";
		submitButtonText = "Registrar Asociado";
		showCancelEdit = false;
	}

	// Initial fetch of federates when the component mounts
	onMount(() => {
		fetchfederates();
	});
</script>

<div class="container">
	<h1 class="text-3xl font-bold text-center text-gray-800 mb-6">
		Registro de Asociados - Federación Argentina de Kendo
	</h1>
	<!-- Updated Title -->

	<!-- Add/Edit federate Form -->
	<div class="mb-8 p-6 border border-gray-200 rounded-lg shadow-sm">
		<h2 class="text-2xl font-semibold text-gray-700 mb-4">
			{formTitle}
		</h2>
		<form on:submit|preventDefault={handleSubmit} class="space-y-4">
			<!-- Personal Details -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label
						for="idNumber"
						class="block text-sm font-medium text-gray-700"
						>Nº Identificación</label
					>
					<input
						type="text"
						id="idNumber"
						bind:value={idNumber}
						required
						class="form-input"
					/>
				</div>
				<div>
					<label
						for="firstName"
						class="block text-sm font-medium text-gray-700"
						>Nombre</label
					>
					<input
						type="text"
						id="firstName"
						bind:value={firstName}
						required
						class="form-input"
					/>
				</div>
				<div>
					<label
						for="lastName"
						class="block text-sm font-medium text-gray-700"
						>Apellido</label
					>
					<input
						type="text"
						id="lastName"
						bind:value={lastName}
						required
						class="form-input"
					/>
				</div>
				<div>
					<label
						for="birthday"
						class="block text-sm font-medium text-gray-700"
						>Fecha de Nacimiento</label
					>
					<input
						type="date"
						id="birthday"
						bind:value={birthday}
						required
						class="form-input"
					/>
				</div>
				<div>
					<label
						for="status"
						class="block text-sm font-medium text-gray-700"
						>Estado</label
					>
					<select
						id="status"
						bind:value={status}
						required
						class="form-input"
					>
						<option value="activo"
							>Activo</option
						>
						<option value="en_deuda"
							>En Deuda</option
						>
						<option value="inactivo"
							>Inactivo</option
						>
					</select>
				</div>
			</div>

			<!-- Kendo Activity Record -->
			<div class="border-t border-gray-200 pt-4 mt-4">
				<label
					class="flex items-center text-lg font-semibold text-gray-700 mb-2"
				>
					<input
						type="checkbox"
						bind:checked={hasKendo}
						class="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded"
					/>
					Registro Kendo
				</label>
				{#if hasKendo}
					<div
						class="grid grid-cols-1 md:grid-cols-2 gap-4"
					>
						<div>
							<label
								for="kendoLastExam"
								class="block text-sm font-medium text-gray-700"
								>Último Examen
								Aprobado</label
							>
							<select
								id="kendoLastExam"
								bind:value={
									kendoLastExam
								}
								class="form-input"
								required
							>
								<option
									value=""
									disabled
									selected
									>Selecciona
									una
									graduación</option
								>
								{#each examLevels as level}
									<option
										value={level}
										>{level}</option
									>
								{/each}
							</select>
						</div>
						<div>
							<label
								for="kendoExamDate"
								class="block text-sm font-medium text-gray-700"
								>Fecha del
								Examen</label
							>
							<input
								type="date"
								id="kendoExamDate"
								bind:value={
									kendoExamDate
								}
								class="form-input"
								required
							/>
						</div>
						<div>
							<label
								for="kendoExamCity"
								class="block text-sm font-medium text-gray-700"
								>Ciudad Donde
								Rindió el Examen</label
							>
							<input
								type="text"
								id="kendoExamCity"
								bind:value={
									kendoExamCity
								}
								class="form-input"
								required
							/>
						</div>
						<div>
							<label
								for="kendoExamEmissor"
								class="block text-sm font-medium text-gray-700"
								>Entidad Emisora
								del Examen</label
							>
							<input
								type="text"
								id="kendoExamEmissor"
								bind:value={
									kendoExamEmissor
								}
								class="form-input"
								required
							/>
						</div>
					</div>
				{/if}
			</div>

			<!-- Iaido Activity Record -->
			<div class="border-t border-gray-200 pt-4 mt-4">
				<label
					class="flex items-center text-lg font-semibold text-gray-700 mb-2"
				>
					<input
						type="checkbox"
						bind:checked={hasIaido}
						class="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded"
					/>
					Registro Iaido
				</label>
				{#if hasIaido}
					<div
						class="grid grid-cols-1 md:grid-cols-2 gap-4"
					>
						<div>
							<label
								for="iaidoLastExam"
								class="block text-sm font-medium text-gray-700"
								>Último Examen</label
							>
							<select
								id="iaidoLastExam"
								bind:value={
									iaidoLastExam
								}
								class="form-input"
								required
							>
								<option
									value=""
									disabled
									selected
									>Selecciona
									una
									graduación</option
								>
								{#each examLevels as level}
									<option
										value={level}
										>{level}</option
									>
								{/each}
							</select>
						</div>
						<div>
							<label
								for="iaidoExamDate"
								class="block text-sm font-medium text-gray-700"
								>Fecha Examen</label
							>
							<input
								type="date"
								id="iaidoExamDate"
								bind:value={
									iaidoExamDate
								}
								class="form-input"
								required
							/>
						</div>
						<div>
							<label
								for="iaidoExamCity"
								class="block text-sm font-medium text-gray-700"
								>Ciudad Examen</label
							>
							<input
								type="text"
								id="iaidoExamCity"
								bind:value={
									iaidoExamCity
								}
								class="form-input"
								required
							/>
						</div>
						<div>
							<label
								for="iaidoExamEmissor"
								class="block text-sm font-medium text-gray-700"
								>Emisor Examen</label
							>
							<input
								type="text"
								id="iaidoExamEmissor"
								bind:value={
									iaidoExamEmissor
								}
								class="form-input"
								required
							/>
						</div>
					</div>
				{/if}
			</div>

			<!-- Jodo Activity Record -->
			<div class="border-t border-gray-200 pt-4 mt-4">
				<label
					class="flex items-center text-lg font-semibold text-gray-700 mb-2"
				>
					<input
						type="checkbox"
						bind:checked={hasJodo}
						class="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded"
					/>
					Registro Jodo
				</label>
				{#if hasJodo}
					<div
						class="grid grid-cols-1 md:grid-cols-2 gap-4"
					>
						<div>
							<label
								for="jodoLastExam"
								class="block text-sm font-medium text-gray-700"
								>Último Examen</label
							>
							<select
								id="jodoLastExam"
								bind:value={
									jodoLastExam
								}
								class="form-input"
								required
							>
								<option
									value=""
									disabled
									selected
									>Selecciona
									una
									graduación</option
								>
								{#each examLevels as level}
									<option
										value={level}
										>{level}</option
									>
								{/each}
							</select>
						</div>
						<div>
							<label
								for="jodoExamDate"
								class="block text-sm font-medium text-gray-700"
								>Fecha Examen</label
							>
							<input
								type="date"
								id="jodoExamDate"
								bind:value={
									jodoExamDate
								}
								class="form-input"
								required
							/>
						</div>
						<div>
							<label
								for="jodoExamCity"
								class="block text-sm font-medium text-gray-700"
								>Ciudad Examen</label
							>
							<input
								type="text"
								id="jodoExamCity"
								bind:value={
									jodoExamCity
								}
								class="form-input"
								required
							/>
						</div>
						<div>
							<label
								for="jodoExamEmissor"
								class="block text-sm font-medium text-gray-700"
								>Emisor Examen</label
							>
							<input
								type="text"
								id="jodoExamEmissor"
								bind:value={
									jodoExamEmissor
								}
								class="form-input"
								required
							/>
						</div>
					</div>
				{/if}
			</div>

			<!-- Form Action Buttons -->
			<div class="flex space-x-4 mt-6">
				<button type="submit" class="btn-primary flex-1"
					>{submitButtonText}</button
				>
				{#if showCancelEdit}
					<button
						type="button"
						class="btn-primary flex-1 bg-gray-500 hover:bg-gray-600"
						on:click={resetForm}
						>Cancelar Edición</button
					>
				{/if}
			</div>
		</form>
	</div>

	<!-- federate List -->
	<div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
		<div class="p-6">
			<h2 class="text-2xl font-semibold text-gray-700 mb-4">
				Asociados Actuales
			</h2>
			<div class="overflow-x-auto">
				<table
					class="min-w-full divide-y divide-gray-200"
				>
					<thead class="bg-gray-50">
						<tr>
							<th class="table-header"
								>Legajo</th
							>
							<th class="table-header"
								>Nombre Completo</th
							>
							<th class="table-header"
								>Fecha
								Nacimiento</th
							>
							<th class="table-header"
								>Estado</th
							>
							<th class="table-header"
								>Kendo</th
							>
							<th class="table-header"
								>Iaido</th
							>
							<th class="table-header"
								>Jodo</th
							>
							<th class="table-header"
								>Acciones</th
							>
						</tr>
					</thead>
					<tbody
						class="bg-white divide-y divide-gray-200"
					>
						{#each federates as federate (federate.ID)}
							<tr>
								<td
									class="table-cell font-medium"
									>{federate.idNumber}</td
								>
								<td
									class="table-cell"
									>{federate.firstName}
									{federate.lastName}</td
								>
								<td
									class="table-cell"
									>{formatDate(
										federate.birthday,
									)}</td
								>
								<td
									class="table-cell capitalize"
									>{formatStatus(
										federate.status,
									)}</td
								>
								<td
									class="table-cell"
								>
									{#if federate.kendo}
										{federate
											.kendo
											.lastExam}
										({federate
											.kendo
											.examEmissor})
										en
										{federate
											.kendo
											.examCity}
										({formatDate(
											federate
												.kendo
												.examDate,
										)})
									{:else}
										Sin
										graduación
									{/if}
								</td>
								<td
									class="table-cell"
								>
									{#if federate.iaido}
										{federate
											.iaido
											.lastExam}
										({federate
											.iaido
											.examEmissor})
										en
										{federate
											.iaido
											.examCity}
										({formatDate(
											federate
												.iaido
												.examDate,
										)})
									{:else}
										Sin
										graduación
									{/if}
								</td>
								<td
									class="table-cell"
								>
									{#if federate.jodo}
										{federate
											.jodo
											.lastExam}
										({federate
											.jodo
											.examEmissor})
										en
										{federate
											.jodo
											.examCity}
										({formatDate(
											federate
												.jodo
												.examDate,
										)})
									{:else}
										Sin
										graduación
									{/if}
								</td>
								<td
									class="table-cell"
								>
									<button
										class="btn-edit mr-2"
										on:click={() =>
											editfederate(
												federate.ID,
											)}
										>Editar</button
									>
									<button
										class="btn-danger"
										on:click={() =>
											deletefederate(
												federate.ID,
											)}
										>Eliminar</button
									>
								</td>
							</tr>
						{:else}
							<tr>
								<td
									colspan="8"
									class="table-cell text-center text-gray-500"
									>No se
									encontraron
									asociados.
									¡Agrega
									uno
									arriba!</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

<style>
	/* Tailwind CSS classes are applied directly in the HTML,
       but custom styles or overrides can go here. */
	.container {
		max-width: 1200px;
		margin: 2rem auto;
		padding: 1.5rem;
		background-color: #ffffff;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}
	.form-input {
		margin-top: 0.25rem;
		display: block;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-width: 1px;
		border-color: #d1d5db;
		border-radius: 0.375rem;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		outline: none;
		--tw-ring-color: #6366f1; /* indigo-500 */
		--tw-border-color: #6366f1; /* indigo-500 */
	}
	.btn-primary {
		display: inline-flex;
		align-items: center;
		padding: 0.5rem 1rem;
		border-width: 1px;
		border-color: transparent;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.375rem;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		color: #ffffff;
		background-color: #4f46e5;
	}
	.btn-primary:hover {
		background-color: #4338ca;
	}
	.btn-primary:focus {
		outline: 2px solid transparent;
		outline-offset: 2px;
		--tw-ring-color: #6366f1;
		box-shadow:
			0 0 0 2px var(--tw-ring-offset-color, #fff),
			0 0 0 4px var(--tw-ring-color);
	}

	.btn-danger {
		display: inline-flex;
		align-items: center;
		padding: 0.375rem 0.75rem;
		border-width: 1px;
		border-color: transparent;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: 0.375rem;
		color: #ffffff;
		background-color: #dc2626;
	}
	.btn-danger:hover {
		background-color: #b91c1c;
	}
	.btn-danger:focus {
		outline: 2px solid transparent;
		outline-offset: 2px;
		--tw-ring-color: #ef4444;
		box-shadow:
			0 0 0 2px var(--tw-ring-offset-color, #fff),
			0 0 0 4px var(--tw-ring-color);
	}
	.btn-edit {
		display: inline-flex;
		align-items: center;
		padding: 0.375rem 0.75rem;
		border-width: 1px;
		border-color: transparent;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: 0.375rem;
		color: #ffffff;
		background-color: #2563eb;
	}
	.btn-edit:hover {
		background-color: #1d4ed8;
	}
	.btn-edit:focus {
		outline: 2px solid transparent;
		outline-offset: 2px;
		--tw-ring-color: #3b82f6;
		box-shadow:
			0 0 0 2px var(--tw-ring-offset-color, #fff),
			0 0 0 4px var(--tw-ring-color);
	}
	.table-header {
		padding: 0.75rem 1.5rem;
		text-align: left;
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.table-cell {
		padding: 1rem 1.5rem;
		white-space: nowrap;
		font-size: 0.875rem;
		color: #111827;
	}
</style>
