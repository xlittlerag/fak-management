export function Spinner({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div
      class="flex items-center justify-center gap-3 py-8 text-steel"
      role="status"
    >
      <div
        aria-hidden="true"
        class="w-5 h-5 rounded-full border-2 border-steel-soft border-t-ai animate-spin"
      />
      <span class="text-sm">{text}</span>
    </div>
  );
}
