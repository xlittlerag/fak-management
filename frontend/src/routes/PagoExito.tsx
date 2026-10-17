import { StatusPage } from '../components/StatusPage';
import { buttonClass } from '../components/ui/Button';

export default function PagoExito() {
  return (
    <StatusPage
      tone="success"
      title="¡Pago Exitoso!"
      description="Su pago ha sido procesado correctamente. Su cuota federativa se encuentra al día."
      action={
        <a href="/dashboard" class={buttonClass('primary')}>
          Volver al inicio
        </a>
      }
    />
  );
}
