export interface RequisitoExamen {
  graduacionPrevia: string | null;
  mesesEspera: number;
  edadMin?: number;
}

export const REQUISITOS_EXAMEN: Record<string, RequisitoExamen> = {
  KYU_3: { graduacionPrevia: null, mesesEspera: 0 },
  KYU_2: { graduacionPrevia: 'KYU_3', mesesEspera: 3 },
  KYU_1: { graduacionPrevia: 'KYU_2', mesesEspera: 3 },
  DAN_1: { graduacionPrevia: 'KYU_1', mesesEspera: 6, edadMin: 13 },
  DAN_2: { graduacionPrevia: 'DAN_1', mesesEspera: 12 },
  DAN_3: { graduacionPrevia: 'DAN_2', mesesEspera: 24 },
  DAN_4: { graduacionPrevia: 'DAN_3', mesesEspera: 36 },
  DAN_5: { graduacionPrevia: 'DAN_4', mesesEspera: 48 },
  DAN_6: { graduacionPrevia: 'DAN_5', mesesEspera: 60 },
  DAN_7: { graduacionPrevia: 'DAN_6', mesesEspera: 72 },
  DAN_8: { graduacionPrevia: 'DAN_7', mesesEspera: 120, edadMin: 46 },
};
