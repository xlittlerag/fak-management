export default function PagoExito() {
  return (
    <div class="min-h-screen flex items-center justify-center bg-slate-50">
      <div class="bg-white p-10 rounded-lg shadow-sm border border-slate-200 text-center max-w-md">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-slate-900 mb-2">¡Pago Exitoso!</h1>
        <p class="text-slate-600 mb-6">Su pago ha sido procesado correctamente. Su cuota federativa se encuentra al día.</p>
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
