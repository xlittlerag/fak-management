import type { ComponentChildren } from 'preact';

type Tone = 'info' | 'success' | 'warning' | 'error';

const tones: Record<Tone, string> = {
  info: 'bg-ai-soft text-ai border-ai/20',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  error: 'bg-hinomaru-soft text-hinomaru border-hinomaru/20',
};

interface AlertProps {
  tone?: Tone;
  class?: string;
  children: ComponentChildren;
}

export function Alert({
  tone = 'info',
  class: className,
  children,
}: AlertProps) {
  return (
    <div
      role="alert"
      class={`rounded-md border px-4 py-3 text-sm ${tones[tone]} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
