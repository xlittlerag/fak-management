import { InstanciaExamen } from '@prisma/client';
import { instanciasRequeridas } from './instancias-examen';

describe('instanciasRequeridas', () => {
  describe('KENDO', () => {
    it.each(['KYU_3', 'KYU_2'])(
      'para %s devuelve solo PRACTICO',
      (graduacion) => {
        expect(instanciasRequeridas('KENDO', graduacion)).toEqual([
          InstanciaExamen.PRACTICO,
        ]);
      },
    );

    it('para KYU_1 devuelve PRACTICO y KATA', () => {
      expect(instanciasRequeridas('KENDO', 'KYU_1')).toEqual([
        InstanciaExamen.PRACTICO,
        InstanciaExamen.KATA,
      ]);
    });

    it.each([
      'DAN_1',
      'DAN_2',
      'DAN_3',
      'DAN_4',
      'DAN_5',
      'DAN_6',
      'DAN_7',
      'DAN_8',
    ])('para %s devuelve PRACTICO, KATA y ESCRITO', (graduacion) => {
      expect(instanciasRequeridas('KENDO', graduacion)).toEqual([
        InstanciaExamen.PRACTICO,
        InstanciaExamen.KATA,
        InstanciaExamen.ESCRITO,
      ]);
    });
  });

  describe('IAIDO', () => {
    it.each(['KYU_3', 'KYU_2', 'KYU_1'])(
      'para %s devuelve solo KATA',
      (graduacion) => {
        expect(instanciasRequeridas('IAIDO', graduacion)).toEqual([
          InstanciaExamen.KATA,
        ]);
      },
    );

    it('para DAN_1 devuelve KATA y ESCRITO', () => {
      expect(instanciasRequeridas('IAIDO', 'DAN_1')).toEqual([
        InstanciaExamen.KATA,
        InstanciaExamen.ESCRITO,
      ]);
    });
  });

  describe('JODO', () => {
    it.each(['KYU_3', 'KYU_2', 'KYU_1'])(
      'para %s devuelve solo KATA',
      (graduacion) => {
        expect(instanciasRequeridas('JODO', graduacion)).toEqual([
          InstanciaExamen.KATA,
        ]);
      },
    );

    it('para DAN_1 devuelve KATA y ESCRITO', () => {
      expect(instanciasRequeridas('JODO', 'DAN_1')).toEqual([
        InstanciaExamen.KATA,
        InstanciaExamen.ESCRITO,
      ]);
    });
  });

  it('para SIN_GRADUACION devuelve lista vacía', () => {
    expect(instanciasRequeridas('KENDO', 'SIN_GRADUACION')).toEqual([]);
  });

  it('para disciplina desconocida devuelve lista vacía', () => {
    expect(instanciasRequeridas('KARATE', 'KYU_3')).toEqual([]);
  });

  it('para graduación desconocida devuelve lista vacía', () => {
    expect(instanciasRequeridas('KENDO', 'SHODAN')).toEqual([]);
  });
});
