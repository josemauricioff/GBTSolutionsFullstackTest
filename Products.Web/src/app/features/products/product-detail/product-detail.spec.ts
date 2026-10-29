import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ProductsApi } from '../../../core/api/products-api';
import { ProductDetail } from './product-detail';

describe('ProductDetail', () => {
  const original = { id: 100000, name: 'Lens', price: 12.5, stock: 5 };
  it('reloads stock from the API after a successful change', async () => {
    const api = {
      get: vi
        .fn()
        .mockReturnValueOnce(of(original))
        .mockReturnValue(of({ ...original, stock: 8 })),
      increaseStock: vi.fn().mockReturnValue(of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'products/:id', component: ProductDetail }]),
        { provide: ProductsApi, useValue: api },
      ],
    });
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/products/100000', ProductDetail);
    page.stockForm.setValue({ quantity: 3 });
    page.changeStock('increase');
    expect(api.increaseStock).toHaveBeenCalledWith(100000, 3);
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(page.product()?.stock).toBe(8);
    expect(page.success()).toContain('Stock updated');
  });
  it('shows insufficient-stock errors and refreshes the current product', async () => {
    const api = {
      get: vi.fn().mockReturnValue(of(original)),
      decreaseStock: vi
        .fn()
        .mockReturnValue(
          throwError(
            () => new HttpErrorResponse({ status: 409, error: { detail: 'Insufficient stock.' } }),
          ),
        ),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'products/:id', component: ProductDetail }]),
        { provide: ProductsApi, useValue: api },
      ],
    });
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/products/100000', ProductDetail);
    page.stockForm.setValue({ quantity: 6 });
    page.changeStock('decrease');
    expect(page.stockError()).toBe('Insufficient stock.');
    expect(page.product()?.stock).toBe(5);
    expect(page.success()).toBe('');
  });
});
