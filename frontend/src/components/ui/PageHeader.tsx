import type { ComponentChildren } from 'preact';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ComponentChildren;
  class?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  class: className,
}: PageHeaderProps) {
  return (
    <header
      class={`mb-6 flex flex-wrap items-end justify-between gap-3 sm:gap-4 ${className ?? ''}`}
    >
      <div class="min-w-0 flex-1">
        {eyebrow && (
          <p class="mb-1 text-xs font-medium tracking-wide text-steel uppercase">
            {eyebrow}
          </p>
        )}
        <h1 class="font-display text-fluid-2xl text-ink">{title}</h1>
        {description && (
          <p class="mt-1 max-w-[60ch] text-sm text-steel">{description}</p>
        )}
      </div>
      {actions && (
        <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
