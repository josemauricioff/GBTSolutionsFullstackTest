import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResult, ProductQuery } from '../models/paged-result';
import { Product, ProductRequest } from '../models/product';

@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/products';

  list(query: ProductQuery): Observable<PagedResult<Product>> {
    let params = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);
    if (query.name) params = params.set('name', query.name);
    if (query.min !== undefined) params = params.set('min', query.min);
    if (query.max !== undefined) params = params.set('max', query.max);
    const hasStockFilter = query.min !== undefined || query.max !== undefined;
    const path =
      query.name && !hasStockFilter
        ? '/search'
        : !query.name && query.min !== undefined && query.max !== undefined
          ? '/stock-level'
          : '';
    return this.http.get<PagedResult<Product>>(this.baseUrl + path, { params });
  }

  get(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }
  create(request: ProductRequest): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, request);
  }
  update(id: number, request: ProductRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, request);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
  increaseStock(id: number, quantity: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/add-to-stock/${quantity}`, null);
  }
  decreaseStock(id: number, quantity: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/decrement-stock/${quantity}`, null);
  }
}
