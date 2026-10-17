import type { ComponentChildren } from 'preact';
import { Wordmark } from './ui/Wordmark';

type Tone = 'success' | 'error' | 'warning';

const tones: Record<Tone, { badge: string; path: string; viewBox: string }> = {
  success: {
    badge: 'bg-success-soft text-success',
    viewBox: '0 0 24 24',
    path: 'M5 13l4 4L19 7',
  },
  error: {
    badge: 'bg-hinomaru-soft text-hinomaru',
    viewBox: '0 0 24 24',
    path: 'M6 18L18 6M6 6l12 12',
  },
  warning: {
    badge: 'bg-warning-soft text-warning',
    viewBox: '0 0 24 24',
    path: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

interface StatusPageProps {
  tone: Tone;
  title: string;
  description: string;
  action: ComponentChildren;
}

/** Página de estado (resultado de pago, error, etc.) sobre el shell de marca. */
export function StatusPage({
  tone,
  title,
  description,
  action,
}: StatusPageProps) {
  const t = tones[tone];
  return (
    <div class="flex min-h-screen flex-col items-center justify-center bg-paper p-4">
      <div class="mb-8">
        <Wordmark />
      </div>
      <div class="w-full max-w-md rounded-xl border border-steel-soft bg-surface p-10 text-center shadow-panel">
        <div
          class={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${t.badge}`}
        >
          <svg
            class="h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox={t.viewBox}
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d={t.path}
            />
          </svg>
        </div>
        <h1 class="font-display text-2xl text-ink">{title}</h1>
        <p class="mt-2 mb-6 text-steel">{description}</p>
        {action}
      </div>
    </div>
  );
}
