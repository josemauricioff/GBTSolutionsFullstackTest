import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ProductsApi } from '../../../core/api/products-api';
import { ProductForm } from './product-form';
import { Product } from '../../../core/models/product';

@Component({ template: 'Saved' })
class SavedProduct {}

describe('ProductForm', () => {
  it('validates inputs and prevents duplicate submissions while saving', async () => {
    const pending = new Subject<Product>();
    const create = vi.fn().mockReturnValue(pending);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'products/new', component: ProductForm },
          { path: 'products/:id', component: SavedProduct },
        ]),
        { provide: ProductsApi, useValue: { create } },
      ],
    });
    const harness = await RouterTestingHarness.create();
    const form = await harness.navigateByUrl('/products/new', ProductForm);
    form.form.setValue({ name: '   ', price: 0, stock: -1 });
    form.save();
    expect(create).not.toHaveBeenCalled();
    form.form.setValue({ name: '  Lens  ', price: 12.5, stock: 0 });
    form.save();
    form.save();
    expect(create).toHaveBeenCalledExactlyOnceWith({ name: 'Lens', price: 12.5, stock: 0 });
    expect(form.saving()).toBe(true);
    pending.complete();
  });
});
