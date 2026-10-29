import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ProductsApi } from '../../../core/api/products-api';
import { ProductList } from './product-list';

describe('ProductList', () => {
  const product = { id: 100000, name: 'Lens', price: 12.5, stock: 5 };
  const firstPage = { items: [product], page: 1, pageSize: 10, totalCount: 12, totalPages: 2 };
  function configure(list: ReturnType<typeof vi.fn>) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'products', component: ProductList }]),
        { provide: ProductsApi, useValue: { list } },
      ],
    });
  }
  it('loads the requested page and preserves server pagination', async () => {
    const list = vi.fn().mockReturnValue(of({ ...firstPage, page: 2 }));
    configure(list);
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/products?page=2&pageSize=10', ProductList);
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 10 }));
    expect(page.result().totalCount).toBe(12);
    expect(harness.routeNativeElement?.textContent).toContain('Lens');
  });
  it('resets the page when applying new filters', async () => {
    const list = vi.fn().mockReturnValue(of(firstPage));
    configure(list);
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/products?page=2', ProductList);
    page.filters.patchValue({ name: '  lens  ', min: 0, max: 20 });
    page.applyFilters();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('page=1');
    expect(list).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, name: 'lens', min: 0, max: 20 }),
    );
  });
  it('returns to the last available page after the result count shrinks', async () => {
    const list = vi
      .fn()
      .mockReturnValueOnce(of({ ...firstPage, items: [], page: 2, totalCount: 1, totalPages: 1 }))
      .mockReturnValue(of({ ...firstPage, totalCount: 1, totalPages: 1 }));
    configure(list);
    const harness = await RouterTestingHarness.create('/products?page=2');
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('page=1');
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
  });
  it('displays API errors instead of reporting an empty inventory', async () => {
    configure(vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 }))));
    const harness = await RouterTestingHarness.create('/products');
    expect(harness.routeNativeElement?.textContent).toContain('API could not be reached');
    expect(harness.routeNativeElement?.textContent).not.toContain('No products found');
  });
});
