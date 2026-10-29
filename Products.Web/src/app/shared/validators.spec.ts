import { FormControl, FormGroup, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { integer, moneyPrecision, notBlank, stockRange } from './validators';

describe('Product form validators', () => {
  it('rejects whitespace-only names', () =>
    expect(new FormControl('   ', notBlank).invalid).toBe(true));
  it('allows zero stock but rejects fractional quantities', () => {
    expect(new FormControl(0, [Validators.min(0), integer]).valid).toBe(true);
    expect(new FormControl(1.5, integer).invalid).toBe(true);
  });
  it('allows monetary precision of at most two decimals', () => {
    expect(new FormControl(12.5, moneyPrecision).valid).toBe(true);
    expect(new FormControl(9999999999.99, moneyPrecision).valid).toBe(true);
    expect(new FormControl(1.001, moneyPrecision).invalid).toBe(true);
  });
  it('rejects reversed stock limits', () => {
    const form = new FormGroup({ min: new FormControl(20), max: new FormControl(10) }, stockRange);
    expect(form.hasError('range')).toBe(true);
    form.patchValue({ min: 0, max: 0 });
    expect(form.valid).toBe(true);
  });
});
