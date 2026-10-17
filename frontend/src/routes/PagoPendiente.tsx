import { StatusPage } from '../components/StatusPage';
import { buttonClass } from '../components/ui/Button';

export default function PagoPendiente() {
  return (
    <StatusPage
      tone="warning"
      title="Pago Pendiente"
      description="Su pago está siendo procesado. Recibirá una confirmación una vez que se acredite."
      action={
        <a href="/dashboard" class={buttonClass('primary')}>
          Volver al inicio
        </a>
      }
    />
  );
}
