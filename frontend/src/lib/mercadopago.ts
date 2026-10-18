const SDK_URL = 'https://sdk.mercadopago.com/js/v2';

let loading: Promise<void> | null = null;

/**
 * Carga el SDK de Mercado Pago on-demand (sólo al iniciar un checkout) en
 * lugar de incluirlo en el <head> de todas las páginas. Idempotente: reutiliza
 * la misma promesa si ya se está cargando o si el SDK ya está presente.
 */
export function loadMercadoPago(): Promise<void> {
  if (typeof window !== 'undefined' && window.MercadoPago) {
    return Promise.resolve();
  }
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error('No se pudo cargar el SDK de Mercado Pago'));
    };
    document.head.appendChild(script);
  });

  return loading;
}
