import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { ProductsApi } from '../../../core/api/products-api';
import { apiErrorMessage } from '../../../core/api/api-error';
import { Product } from '../../../core/models/product';
import { integer } from '../../../shared/validators';

@Component({
  selector: 'app-product-detail',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  private readonly api = inject(ProductsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly product = signal<Product | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly stockError = signal('');
  readonly success = signal('');
  readonly stockForm = new FormGroup({
    quantity: new FormControl<number | null>(1, [
      Validators.required,
      Validators.min(1),
      Validators.max(2147483647),
      integer,
    ]),
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.loading.set(true);
          this.error.set('');
          return this.api.get(Number(params.get('id'))).pipe(
            catchError((error) => {
              this.error.set(apiErrorMessage(error));
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((product) => this.product.set(product));
  }

  changeStock(direction: 'increase' | 'decrease'): void {
    this.stockForm.markAllAsTouched();
    const product = this.product();
    if (!product || this.stockForm.invalid || this.busy()) return;
    const quantity = this.stockForm.controls.quantity.value!;
    this.busy.set(true);
    this.stockError.set('');
    this.success.set('');
    const operation =
      direction === 'increase'
        ? this.api.increaseStock(product.id, quantity)
        : this.api.decreaseStock(product.id, quantity);
    operation
      .pipe(
        switchMap(() => this.api.get(product.id)),
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.product.set(updated);
          this.stockForm.reset({ quantity: 1 });
          this.success.set('Stock updated successfully.');
        },
        error: (error) => {
          this.stockError.set(apiErrorMessage(error));
          this.refresh();
        },
      });
  }

  refresh(): void {
    const product = this.product();
    if (!product) return;
    this.api
      .get(product.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => this.product.set(updated),
        error: (error) => this.stockError.set(apiErrorMessage(error)),
      });
  }

  deleteProduct(): void {
    const product = this.product();
    if (
      !product ||
      this.busy() ||
      !window.confirm(`Delete "${product.name}"? This action cannot be undone.`)
    )
      return;
    this.busy.set(true);
    this.stockError.set('');
    this.api
      .delete(product.id)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/products'], { queryParamsHandling: 'preserve' });
        },
        error: (error) => this.stockError.set(apiErrorMessage(error)),
      });
  }
}
