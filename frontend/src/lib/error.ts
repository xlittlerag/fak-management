interface ErrorWithResponse {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

export function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;

  const errResp = err as ErrorWithResponse;
  const msg = errResp.response?.data?.message;
  if (Array.isArray(msg)) return msg[0];
  if (typeof msg === 'string') return msg;

  return 'Error inesperado';
}
