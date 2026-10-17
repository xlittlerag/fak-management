import type { ComponentChildren } from 'preact';
import { Monogram, Wordmark } from './ui/Wordmark';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  /** Tarjeta más ancha para formularios extensos (p. ej. registro). */
  wide?: boolean;
  children: ComponentChildren;
  footer?: ComponentChildren;
}

/**
 * Shell de identidad para pantallas de autenticación: panel ai-zome con el
 * aparato gráfico (enso + shiaijo) a la izquierda y la tarjeta sobre papel a
 * la derecha. En móvil el panel se oculta y queda el wordmark compacto.
 */
export function AuthLayout({
  title,
  subtitle,
  wide = false,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div class="min-h-screen bg-paper lg:grid lg:grid-cols-2">
      <aside class="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden="true" class="pointer-events-none absolute inset-0">
          <div class="absolute -top-24 -right-24 h-96 w-96 rounded-full border border-white/10" />
          <div class="absolute top-40 -right-16 h-72 w-72 rounded-full border border-white/5" />
          <div class="absolute top-0 left-12 h-full w-px bg-white/10" />
        </div>

        <Wordmark tone="light" class="relative" />

        <div class="relative">
          <Monogram size={72} class="text-white/90" />
          <h2 class="mt-6 font-display text-3xl leading-tight text-white">
            El camino del kendo,
            <br />
            en orden.
          </h2>
          <p class="mt-4 max-w-sm text-sm text-white/60">
            Socios, cuotas, eventos, exámenes y diplomas de la Federación
            Argentina de Kendo en una sola plataforma.
          </p>
        </div>

        <p class="relative text-xs tracking-wide text-white/40">
          Federación Argentina de Kendo
        </p>
      </aside>

      <main class="flex min-h-screen items-center justify-center p-4 py-10">
        <div class={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
          <div class="mb-6 flex justify-center lg:hidden">
            <Wordmark />
          </div>

          <div class="rounded-xl border border-steel-soft bg-surface p-6 shadow-panel sm:p-8">
            <h1 class="font-display text-xl text-ink">{title}</h1>
            {subtitle && <p class="mt-1 mb-6 text-sm text-steel">{subtitle}</p>}
            {!subtitle && <div class="mb-6" />}
            {children}
          </div>

          {footer && (
            <div class="mt-6 text-center text-sm text-steel">{footer}</div>
          )}
        </div>
      </main>
    </div>
  );
}
