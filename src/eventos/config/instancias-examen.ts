import { InstanciaExamen } from '@prisma/client';

const GRADUACION_RANK: Record<string, number> = {
  SIN_GRADUACION: 0,
  KYU_3: 1,
  KYU_2: 2,
  KYU_1: 3,
  DAN_1: 4,
  DAN_2: 5,
  DAN_3: 6,
  DAN_4: 7,
  DAN_5: 8,
  DAN_6: 9,
  DAN_7: 10,
  DAN_8: 11,
};

const esKendo = (disciplina: string) => disciplina === 'KENDO';
const esKataSolo = (disciplina: string) =>
  disciplina === 'IAIDO' || disciplina === 'JODO';

export function instanciasRequeridas(
  disciplina: string,
  graduacion: string,
): InstanciaExamen[] {
  const disc = disciplina.toUpperCase();
  const grad = graduacion.toUpperCase();

  if (esKendo(disc)) {
    if (grad === 'KYU_3' || grad === 'KYU_2') {
      return [InstanciaExamen.PRACTICO];
    }
    if (grad === 'KYU_1') {
      return [InstanciaExamen.PRACTICO, InstanciaExamen.KATA];
    }
    if ((GRADUACION_RANK[grad] ?? -1) >= GRADUACION_RANK.DAN_1) {
      return [
        InstanciaExamen.PRACTICO,
        InstanciaExamen.KATA,
        InstanciaExamen.ESCRITO,
      ];
    }
    return [];
  }

  if (esKataSolo(disc)) {
    if (grad === 'KYU_3' || grad === 'KYU_2' || grad === 'KYU_1') {
      return [InstanciaExamen.KATA];
    }
    if ((GRADUACION_RANK[grad] ?? -1) >= GRADUACION_RANK.DAN_1) {
      return [InstanciaExamen.KATA, InstanciaExamen.ESCRITO];
    }
    return [];
  }

  return [];
}
