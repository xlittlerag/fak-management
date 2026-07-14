import { useLocation } from 'preact-iso';

export default function NotFound() {
  const { route } = useLocation();
  return (
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div class="text-center max-w-sm">
        <h1 class="text-6xl font-bold text-slate-200 mb-4">404</h1>
        <p class="text-lg text-slate-600 mb-6">Página no encontrada</p>
        <button onClick={() => route('/')}
          class="px-6 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
