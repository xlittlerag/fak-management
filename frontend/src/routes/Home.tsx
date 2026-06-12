export default function Home() {
  return (
    <div class="p-8">
      <h1 class="text-4xl font-bold">Bienvenido a Kendo Manager</h1>
      <p class="mt-4">Plataforma de gestión para dojos y practicantes.</p>
      <div class="mt-8 space-x-4">
        <a href="/login" class="px-6 py-2 bg-slate-900 text-white rounded">Iniciar Sesión</a>
        <a href="/register" class="px-6 py-2 bg-slate-200 text-slate-900 rounded">Registrarse</a>
      </div>
    </div>
  );
}
