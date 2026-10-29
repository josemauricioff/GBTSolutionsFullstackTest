import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProductsApi } from './products-api';

describe('ProductsApi', () => {
  let api: ProductsApi;
  let http: HttpTestingController;
  const product = { id: 100000, name: 'Lens', price: 12.5, stock: 5 };
  const page = { items: [product], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ProductsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('requests only the selected page from the API', () => {
    api.list({ page: 2, pageSize: 25 }).subscribe((result) => expect(result.totalCount).toBe(1));
    const request = http.expectOne((req) => req.url === '/api/products');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('25');
    request.flush(page);
  });

  it('uses the partial-name search endpoint and encodes the query', () => {
    api.list({ page: 1, pageSize: 10, name: 'Lens & cleaner' }).subscribe();
    const request = http.expectOne((req) => req.url === '/api/products/search');
    expect(request.request.params.get('name')).toBe('Lens & cleaner');
    request.flush(page);
  });

  it('uses the stock endpoint and preserves a zero lower limit', () => {
    api.list({ page: 1, pageSize: 10, min: 0, max: 25 }).subscribe();
    const request = http.expectOne((req) => req.url === '/api/products/stock-level');
    expect(request.request.params.get('min')).toBe('0');
    expect(request.request.params.get('max')).toBe('25');
    request.flush(page);
  });

  it('sends combined filters to the paginated listing endpoint', () => {
    api.list({ page: 1, pageSize: 10, name: 'Lens', min: 0, max: 50 }).subscribe();
    const request = http.expectOne((req) => req.url === '/api/products');
    expect(request.request.params.get('name')).toBe('Lens');
    expect(request.request.params.get('max')).toBe('50');
    request.flush(page);
  });

  it('retrieves a product by its assigned identifier', () => {
    api.get(100000).subscribe((result) => expect(result.stock).toBe(5));
    http.expectOne('/api/products/100000').flush(product);
  });

  it('creates a product without sending an identifier', () => {
    const body = { name: 'Lens', price: 12.5, stock: 5 };
    api.create(body).subscribe((result) => expect(result.id).toBe(100000));
    const request = http.expectOne('/api/products');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(product, { status: 201, statusText: 'Created' });
  });

  it('accepts the empty response when updating a product', () => {
    api.update(100000, { name: 'Updated lens', price: 20, stock: 0 }).subscribe();
    const request = http.expectOne('/api/products/100000');
    expect(request.request.method).toBe('PUT');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('deletes a product', () => {
    api.delete(100000).subscribe();
    const request = http.expectOne('/api/products/100000');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('calls both stock endpoints with the requested quantities', () => {
    api.increaseStock(100000, 3).subscribe();
    api.decreaseStock(100000, 2).subscribe();
    const increase = http.expectOne('/api/products/100000/add-to-stock/3');
    const decrease = http.expectOne('/api/products/100000/decrement-stock/2');
    expect(increase.request.method).toBe('POST');
    expect(decrease.request.method).toBe('POST');
    increase.flush(null);
    decrease.flush(null);
  });
});
