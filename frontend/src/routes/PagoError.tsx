import { StatusPage } from '../components/StatusPage';
import { buttonClass } from '../components/ui/Button';

export default function PagoError() {
  return (
    <StatusPage
      tone="error"
      title="Pago No Completado"
      description="El pago no pudo completarse. Puede intentarlo nuevamente desde su panel."
      action={
        <a href="/dashboard" class={buttonClass('primary')}>
          Intentar nuevamente
        </a>
      }
    />
  );
}
