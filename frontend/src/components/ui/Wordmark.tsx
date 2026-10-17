interface MonogramProps {
  size?: number;
  class?: string;
}

export function Monogram({ size = 28, class: className }: MonogramProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      class={className}
    >
      <path
        d="M16 4a12 12 0 1 1-8.2 20.8"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
      />
      <path
        d="M16 9v16"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
      />
      <circle cx="16" cy="16" r="2.6" fill="var(--color-hinomaru)" />
    </svg>
  );
}

interface WordmarkProps {
  tone?: 'dark' | 'light';
  showSubtitle?: boolean;
  class?: string;
}

export function Wordmark({
  tone = 'dark',
  showSubtitle = true,
  class: className,
}: WordmarkProps) {
  const title = tone === 'light' ? 'text-white' : 'text-ink';
  const subtitle = tone === 'light' ? 'text-white/60' : 'text-steel';
  const mark = tone === 'light' ? 'text-white' : 'text-ai';

  return (
    <span class={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <Monogram class={`shrink-0 ${mark}`} />
      <span class="leading-tight">
        <span class={`block font-display text-lg ${title}`}>
          Kendo Argentina
        </span>
        {showSubtitle && (
          <span class={`block text-[11px] tracking-wide ${subtitle}`}>
            Federación Argentina de Kendo
          </span>
        )}
      </span>
    </span>
  );
}
