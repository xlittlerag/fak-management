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
      class={`mb-6 flex flex-wrap items-end justify-between gap-4 ${className ?? ''}`}
    >
      <div class="min-w-0">
        {eyebrow && (
          <p class="mb-1 text-xs font-medium tracking-wide text-steel uppercase">
            {eyebrow}
          </p>
        )}
        <h1 class="font-display text-2xl text-ink">{title}</h1>
        {description && (
          <p class="mt-1 max-w-[60ch] text-sm text-steel">{description}</p>
        )}
      </div>
      {actions && <div class="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
