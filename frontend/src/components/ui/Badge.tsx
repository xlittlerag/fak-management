import type { ComponentChildren } from 'preact';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-paper text-steel border-steel-soft',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  danger: 'bg-hinomaru-soft text-hinomaru border-hinomaru/20',
  info: 'bg-ai-soft text-ai border-ai/20',
};

export function Badge({
  tone = 'neutral',
  children,
  class: className,
}: {
  tone?: Tone;
  children: ComponentChildren;
  class?: string;
}) {
  return (
    <span
      class={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className ?? ''}`}
    >
      {children}
    </span>
  );
}
