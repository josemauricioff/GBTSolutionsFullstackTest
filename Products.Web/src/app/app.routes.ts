import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'products' },
  {
    path: 'products/new',
    title: 'New product | GBT Solutions',
    loadComponent: () =>
      import('./features/products/product-form/product-form').then((m) => m.ProductForm),
  },
  {
    path: 'products/:id/edit',
    title: 'Edit product | GBT Solutions',
    loadComponent: () =>
      import('./features/products/product-form/product-form').then((m) => m.ProductForm),
  },
  {
    path: 'products/:id',
    title: 'Product details | GBT Solutions',
    loadComponent: () =>
      import('./features/products/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'products',
    title: 'Products | GBT Solutions',
    loadComponent: () =>
      import('./features/products/product-list/product-list').then((m) => m.ProductList),
  },
  { path: '**', redirectTo: 'products' },
];
