import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, finalize, map, of, startWith, Subject, switchMap } from 'rxjs';
import { ProductsApi } from '../../../core/api/products-api';
import { apiErrorMessage } from '../../../core/api/api-error';
import { PagedResult, ProductQuery } from '../../../core/models/paged-result';
import { Product } from '../../../core/models/product';
import { Pagination } from '../../../shared/pagination/pagination';
import { integer, stockRange } from '../../../shared/validators';

@Component({
  selector: 'app-product-list',
  imports: [DecimalPipe, RouterLink, ReactiveFormsModule, Pagination],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit {
  private readonly api = inject(ProductsApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refreshTrigger = new Subject<void>();
  readonly loading = signal(true);
  readonly error = signal('');
  readonly query = signal<ProductQuery>({ page: 1, pageSize: 10 });
  readonly result = signal<PagedResult<Product>>({
    items: [],
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });
  readonly filters = new FormGroup(
    {
      name: new FormControl('', { nonNullable: true }),
      min: new FormControl<number | null>(null, [
        Validators.min(0),
        Validators.max(2147483647),
        integer,
      ]),
      max: new FormControl<number | null>(null, [
        Validators.min(0),
        Validators.max(2147483647),
        integer,
      ]),
    },
    { validators: stockRange },
  );

  ngOnInit(): void {
    combineLatest([this.route.queryParamMap, this.refreshTrigger.pipe(startWith(undefined))])
      .pipe(
        map(([params]) => this.readQuery(params)),
        switchMap((query) => {
          this.query.set(query);
          this.filters.patchValue(
            { name: query.name ?? '', min: query.min ?? null, max: query.max ?? null },
            { emitEvent: false },
          );
          this.loading.set(true);
          this.error.set('');
          return this.api.list(query).pipe(
            catchError((error) => {
              this.error.set(apiErrorMessage(error));
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (!result) return;
        const lastPage = Math.max(1, result.totalPages);
        if (this.query().page > lastPage) {
          this.changePage(lastPage);
          return;
        }
        this.result.set(result);
      });
  }

  refresh(): void {
    this.refreshTrigger.next();
  }

  applyFilters(): void {
    this.filters.markAllAsTouched();
    if (this.filters.invalid) return;
    const values = this.filters.getRawValue();
    this.navigate({
      page: 1,
      pageSize: this.query().pageSize,
      name: values.name.trim() || undefined,
      min: values.min ?? undefined,
      max: values.max ?? undefined,
    });
  }

  clearFilters(): void {
    this.navigate({ page: 1, pageSize: this.query().pageSize });
  }
  changePage(page: number): void {
    this.navigate({ ...this.query(), page });
  }
  changePageSize(pageSize: number): void {
    this.navigate({ ...this.query(), page: 1, pageSize });
  }

  private navigate(query: ProductQuery): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: query });
  }

  private readQuery(params: ParamMap): ProductQuery {
    const positive = (value: string | null, fallback: number) => {
      const number = Number(value);
      return Number.isSafeInteger(number) && number > 0 ? number : fallback;
    };
    const stock = (value: string | null): number | undefined => {
      if (value === null || value === '') return undefined;
      const number = Number(value);
      return Number.isInteger(number) && number >= 0 && number <= 2147483647 ? number : undefined;
    };
    const requestedSize = positive(params.get('pageSize'), 10);
    return {
      page: positive(params.get('page'), 1),
      pageSize: [10, 25, 50].includes(requestedSize) ? requestedSize : 10,
      name: params.get('name')?.trim() || undefined,
      min: stock(params.get('min')),
      max: stock(params.get('max')),
    };
  }
}
