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
        <header class="flex flex-wrap items-start justify-between gap-2 border-b border-steel-soft/70 px-4 py-3.5 sm:gap-4 sm:px-5">
          <div class="min-w-0 flex-1">
            {title && (
              <h2 class="font-display text-fluid-lg text-ink">{title}</h2>
            )}
            {description && (
              <p class="mt-0.5 text-sm text-steel">{description}</p>
            )}
          </div>
          {actions && (
            <div class="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
              {actions}
            </div>
          )}
        </header>
      )}
      <div class={bodyClass ?? 'p-4 sm:p-5'}>{children}</div>
    </section>
  );
}
