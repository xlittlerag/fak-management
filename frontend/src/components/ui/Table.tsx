import type { ComponentChildren } from 'preact';

export const thClass =
  'px-4 py-2 text-left text-xs font-medium tracking-wide text-steel uppercase whitespace-nowrap border-b border-steel-soft';

export const tdClass = 'px-4 py-3 border-b border-steel-soft/60 align-middle';

interface TableProps {
  class?: string;
  children: ComponentChildren;
}

export function Table({ class: className, children }: TableProps) {
  return (
    <div class="overflow-x-auto">
      <table class={`tnum w-full text-sm ${className ?? ''}`}>{children}</table>
    </div>
  );
}
