import { BadRequestException } from '@nestjs/common';

// Edad máxima aceptada para una fecha de nacimiento (TC-04: 11/01/1111).
const EDAD_MAXIMA_ANIOS = 120;

function parsearFecha(value: string | Date, mensaje: string): Date {
  const fecha = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(fecha.getTime())) {
    throw new BadRequestException(mensaje);
  }
  return fecha;
}

/** Fecha de nacimiento: no futura y con edad máxima razonable. */
export function validarFechaNacimiento(value: string | Date): Date {
  const fecha = parsearFecha(
    value,
    'La fecha de nacimiento ingresada no es válida.',
  );
  if (fecha > new Date()) {
    throw new BadRequestException(
      'La fecha de nacimiento no puede ser futura.',
    );
  }
  const ahora = new Date();
  let edad = ahora.getFullYear() - fecha.getFullYear();
  const mes = ahora.getMonth() - fecha.getMonth();
  if (mes < 0 || (mes === 0 && ahora.getDate() < fecha.getDate())) {
    edad--;
  }
  if (edad > EDAD_MAXIMA_ANIOS) {
    throw new BadRequestException(
      'La fecha de nacimiento ingresada no es válida.',
    );
  }
  return fecha;
}

/**
 * Fecha de obtención de un grado (certificados externos, TC-07):
 * no puede ser futura. Pasada sí (el grado puede ser anterior a la carga).
 */
export function validarFechaObtencion(value: string | Date): Date {
  const fecha = parsearFecha(value, 'La fecha de obtención no es válida.');
  if (fecha > new Date()) {
    throw new BadRequestException('La fecha de obtención no puede ser futura.');
  }
  return fecha;
}
