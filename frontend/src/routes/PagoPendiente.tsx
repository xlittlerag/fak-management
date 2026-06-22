export default function PagoPendiente() {
  return (
    <div class="min-h-screen flex items-center justify-center bg-slate-50">
      <div class="bg-white p-10 rounded-lg shadow-sm border border-slate-200 text-center max-w-md">
        <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-slate-900 mb-2">Pago Pendiente</h1>
        <p class="text-slate-600 mb-6">Su pago está siendo procesado. Recibirá una confirmación una vez que se acredite.</p>
        <a
          href="/dashboard"
          class="inline-block bg-slate-900 text-white px-6 py-3 rounded font-medium hover:bg-slate-800 transition-colors"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
