import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, Observable, of, switchMap } from 'rxjs';
import { ProductsApi } from '../../../core/api/products-api';
import { apiErrorMessage } from '../../../core/api/api-error';
import { Product } from '../../../core/models/product';
import { integer, moneyPrecision, notBlank } from '../../../shared/validators';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm implements OnInit {
  private readonly api = inject(ProductsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly id = signal<number | null>(null);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200), notBlank],
    }),
    price: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(9999999999.99),
      moneyPrecision,
    ]),
    stock: new FormControl<number | null>(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(2147483647),
      integer,
    ]),
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const value = params.get('id');
          this.id.set(value === null ? null : Number(value));
          this.loading.set(true);
          this.loadFailed.set(false);
          this.error.set('');
          const request: Observable<Product | null> =
            this.id() === null ? of(null) : this.api.get(this.id()!);
          return request.pipe(
            catchError((error) => {
              this.error.set(apiErrorMessage(error));
              this.loadFailed.set(true);
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((product) => {
        this.form.reset({
          name: product?.name ?? '',
          price: product?.price ?? null,
          stock: product?.stock ?? 0,
        });
      });
  }

  invalid(name: 'name' | 'price' | 'stock'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving() || this.loading() || this.loadFailed()) return;
    const value = this.form.getRawValue();
    const request = { name: value.name.trim(), price: value.price!, stock: value.stock! };
    this.saving.set(true);
    this.error.set('');
    const operation =
      this.id() === null
        ? this.api.create(request)
        : this.api.update(this.id()!, request).pipe(switchMap(() => this.api.get(this.id()!)));
    operation
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (product) => {
          void this.router.navigate(['/products', product.id], { queryParamsHandling: 'preserve' });
        },
        error: (error) => this.error.set(apiErrorMessage(error)),
      });
  }
}
