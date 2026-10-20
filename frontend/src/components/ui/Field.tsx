import type { ComponentChildren, JSX } from 'preact';

export const controlClass =
  'w-full min-h-11 rounded-md border border-steel-soft bg-surface px-3 py-2 text-base text-ink placeholder:text-steel/70 transition-colors focus:border-ai focus:outline-none focus:ring-2 focus:ring-ai/20 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm';

interface FieldProps {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optionalHint?: boolean;
  class?: string;
  children: ComponentChildren;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  optionalHint = false,
  class: className,
  children,
}: FieldProps) {
  return (
    <div class={className}>
      {label && (
        <label
          htmlFor={htmlFor}
          class="mb-1 block text-sm font-medium text-ink"
        >
          {label}
          {!required && optionalHint && (
            <span class="font-normal text-steel"> (opcional)</span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p class="mt-1 text-xs text-hinomaru" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p class="mt-1 text-xs text-steel">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  class: className,
  ...rest
}: JSX.IntrinsicElements['input']) {
  return <input {...rest} class={`${controlClass} ${className ?? ''}`} />;
}

export function Select({
  class: className,
  ...rest
}: JSX.IntrinsicElements['select']) {
  return <select {...rest} class={`${controlClass} ${className ?? ''}`} />;
}

export function Textarea({
  class: className,
  ...rest
}: JSX.IntrinsicElements['textarea']) {
  return <textarea {...rest} class={`${controlClass} ${className ?? ''}`} />;
}
