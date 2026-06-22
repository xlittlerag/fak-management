export default function PagoError() {
  return (
    <div class="min-h-screen flex items-center justify-center bg-slate-50">
      <div class="bg-white p-10 rounded-lg shadow-sm border border-slate-200 text-center max-w-md">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-slate-900 mb-2">Pago No Completado</h1>
        <p class="text-slate-600 mb-6">El pago no pudo completarse. Puede intentarlo nuevamente desde su panel.</p>
        <a
          href="/dashboard"
          class="inline-block bg-slate-900 text-white px-6 py-3 rounded font-medium hover:bg-slate-800 transition-colors"
        >
          Intentar nuevamente
        </a>
      </div>
    </div>
  );
}
