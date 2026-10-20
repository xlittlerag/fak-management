import type { ComponentChildren, JSX } from 'preact';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends Omit<JSX.IntrinsicElements['button'], 'size'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ComponentChildren;
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary: 'bg-ai text-white hover:bg-ai-strong',
  secondary: 'bg-surface text-ink border border-steel-soft hover:bg-ai-soft',
  ghost: 'text-ai hover:bg-ai-soft',
  danger: 'bg-hinomaru text-white hover:bg-hinomaru/90',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-11 text-sm px-3 py-1.5',
  md: 'min-h-11 text-sm px-4 py-2.5',
};

/** Clases del botón, reutilizables en enlaces que deben verse como botón. */
export function buttonClass(
  variant: Variant = 'primary',
  size: Size = 'md',
  extra?: string,
): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra ?? ''}`.trim();
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  class: className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      class={buttonClass(variant, size, className as string | undefined)}
    >
      {loading && (
        <span
          aria-hidden="true"
          class="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"
        />
      )}
      {children}
    </button>
  );
}
