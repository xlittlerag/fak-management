interface Window {
  MercadoPago: new (publicKey: string) => {
    checkout: (opts: { preference: { id: string }; render: { container: string; label: string } }) => void;
  };
}
