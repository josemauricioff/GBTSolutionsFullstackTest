import { AbstractControl, ValidationErrors } from '@angular/forms';

export function notBlank(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && !control.value.trim() ? { blank: true } : null;
}

export function integer(control: AbstractControl): ValidationErrors | null {
  return control.value === null || control.value === '' || Number.isInteger(control.value)
    ? null
    : { integer: true };
}

export function moneyPrecision(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return value === null ||
    value === '' ||
    (Number.isFinite(value) && Number(value.toFixed(2)) === value)
    ? null
    : { precision: true };
}

export function stockRange(control: AbstractControl): ValidationErrors | null {
  const { min, max } = control.value as { min: number | null; max: number | null };
  return min !== null && max !== null && min > max ? { range: true } : null;
}
