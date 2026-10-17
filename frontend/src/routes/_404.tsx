import { useLocation } from 'preact-iso';
import { Wordmark } from '../components/ui/Wordmark';
import { buttonClass } from '../components/ui/Button';

export default function NotFound() {
  const { route } = useLocation();
  return (
    <div class="flex min-h-screen flex-col items-center justify-center bg-paper p-4">
      <div class="mb-8">
        <Wordmark />
      </div>
      <div class="w-full max-w-sm rounded-xl border border-steel-soft bg-surface p-10 text-center shadow-panel">
        <p class="font-display text-6xl text-steel-soft">404</p>
        <p class="mt-4 mb-6 text-lg text-ink">Página no encontrada</p>
        <button onClick={() => route('/')} class={buttonClass('primary')}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
