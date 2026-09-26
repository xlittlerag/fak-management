export const GRAD_LABELS: Record<string, string> = {
  SIN_GRADUACION: 'Sin graduación', KYU_3: '3° Kyu', KYU_2: '2° Kyu', KYU_1: '1° Kyu',
  DAN_1: '1° Dan', DAN_2: '2° Dan', DAN_3: '3° Dan', DAN_4: '4° Dan',
  DAN_5: '5° Dan', DAN_6: '6° Dan', DAN_7: '7° Dan', DAN_8: '8° Dan',
};

export const GRAD_LABEL: Record<string, string> = GRAD_LABELS;

export const DISCIPLINA_LABELS: Record<string, string> = {
  KENDO: 'Kendo', IAIDO: 'Iaido', JODO: 'Jodo',
};

export const DISC_LABEL: Record<string, string> = DISCIPLINA_LABELS;

export const GRAD_RANK: Record<string, number> = {
  SIN_GRADUACION: 0, KYU_3: 1, KYU_2: 2, KYU_1: 3,
  DAN_1: 4, DAN_2: 5, DAN_3: 6, DAN_4: 7,
  DAN_5: 8, DAN_6: 9, DAN_7: 10, DAN_8: 11,
};

export const GRADUACION_RANK: Record<string, number> = GRAD_RANK;

export function computeNextGrad(currentGrad: string): string | null {
  const rank = GRAD_RANK[currentGrad];
  if (rank === undefined) return null;
  const next = Object.entries(GRAD_RANK).find(([_, r]) => r === rank + 1);
  return next ? next[0] : null;
}
