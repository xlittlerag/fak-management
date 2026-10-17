import type { ComponentChildren } from 'preact';

interface PanelProps {
  title?: string;
  description?: string;
  actions?: ComponentChildren;
  /** Marco "shiaijo": borde con ticks índigo en las esquinas. */
  frame?: boolean;
  class?: string;
  bodyClass?: string;
  children: ComponentChildren;
}

function FrameTicks() {
  const tick = 'absolute w-3 h-3 border-ai';
  return (
    <>
      <span
        aria-hidden="true"
        class={`${tick} -top-px -left-px border-t-2 border-l-2`}
      />
      <span
        aria-hidden="true"
        class={`${tick} -top-px -right-px border-t-2 border-r-2`}
      />
      <span
        aria-hidden="true"
        class={`${tick} -bottom-px -left-px border-b-2 border-l-2`}
      />
      <span
        aria-hidden="true"
        class={`${tick} -bottom-px -right-px border-b-2 border-r-2`}
      />
    </>
  );
}

export function Panel({
  title,
  description,
  actions,
  frame = false,
  class: className,
  bodyClass,
  children,
}: PanelProps) {
  return (
    <section
      class={`relative rounded-lg border border-steel-soft bg-surface shadow-panel ${className ?? ''}`}
    >
      {frame && <FrameTicks />}
      {(title || actions) && (
        <header class="flex items-start justify-between gap-4 border-b border-steel-soft/70 px-5 py-3.5">
          <div class="min-w-0">
            {title && <h2 class="font-display text-base text-ink">{title}</h2>}
            {description && (
              <p class="mt-0.5 text-sm text-steel">{description}</p>
            )}
          </div>
          {actions && (
            <div class="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      <div class={bodyClass ?? 'p-5'}>{children}</div>
    </section>
  );
}
