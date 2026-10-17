import type { ComponentChildren } from 'preact';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ComponentChildren;
  action?: ComponentChildren;
  class?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  class: className,
}: EmptyStateProps) {
  return (
    <div class={`px-6 py-12 text-center ${className ?? ''}`}>
      {icon && <div class="mx-auto mb-3 h-8 w-8 text-steel-soft">{icon}</div>}
      <p class="font-medium text-ink">{title}</p>
      {description && <p class="mt-1 text-sm text-steel">{description}</p>}
      {action && <div class="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
