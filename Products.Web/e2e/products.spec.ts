import { expect, Page, test } from '@playwright/test';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

async function interceptApi(page: Page): Promise<void> {
  let products: Product[] = Array.from({ length: 31 }, (_, index) => ({
    id: 100000 + index,
    name: `Product ${String(index + 1).padStart(2, '0')}`,
    price: 10 + index / 2,
    stock: index * 2,
  }));
  let nextIdentifier = 100031;

  await page.route('**/api/products**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const tail = url.pathname.slice('/api/products'.length);
    const json = (value: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });

    if (request.method() === 'GET' && ['', '/search', '/stock-level'].includes(tail)) {
      const number = Number(url.searchParams.get('page') ?? 1);
      const pageSize = Number(url.searchParams.get('pageSize') ?? 10);
      const name = (url.searchParams.get('name') ?? '').toLowerCase();
      const min = Number(url.searchParams.get('min') ?? 0);
      const max = Number(url.searchParams.get('max') ?? 2147483647);
      const matches = products.filter(
        (product) =>
          product.name.toLowerCase().includes(name) && product.stock >= min && product.stock <= max,
      );
      return json({
        items: matches.slice((number - 1) * pageSize, number * pageSize),
        page: number,
        pageSize,
        totalCount: matches.length,
        totalPages: Math.ceil(matches.length / pageSize),
      });
    }

    if (request.method() === 'POST' && tail === '') {
      const product = { ...request.postDataJSON(), id: nextIdentifier++ } as Product;
      products.push(product);
      return json(product, 201);
    }

    const segments = tail.split('/').filter(Boolean);
    const id = Number(segments[0]);
    const product = products.find((item) => item.id === id);
    if (!product) return json({ detail: 'Product not found.' }, 404);
    if (request.method() === 'GET') return json(product);
    if (request.method() === 'PUT') {
      Object.assign(product, request.postDataJSON(), { id });
      return route.fulfill({ status: 204 });
    }
    if (request.method() === 'DELETE') {
      products = products.filter((item) => item.id !== id);
      return route.fulfill({ status: 204 });
    }
    if (request.method() === 'POST' && segments.length === 3) {
      const quantity = Number(segments[2]);
      if (segments[1] === 'decrement-stock' && product.stock < quantity)
        return json({ detail: 'Insufficient stock.' }, 409);
      product.stock += segments[1] === 'add-to-stock' ? quantity : -quantity;
      return route.fulfill({ status: 200 });
    }
    return json({ detail: 'Unexpected test API request.' }, 500);
  });
}

test.beforeEach(async ({ page }) => interceptApi(page));

test('server pagination, page-size changes and filters work together', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: 'Product inventory' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Product 01', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('inventory-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole('link', { name: 'Product 11', exact: true })).toBeVisible();
  await page.getByLabel('Rows per page').selectOption('25');
  await expect(page).toHaveURL(/page=1/);
  await expect(page.getByRole('link', { name: 'Product 25', exact: true })).toBeVisible();
  await page.getByLabel('Search products').fill('Product 03');
  await page.getByLabel('Min. stock').fill('3');
  await page.getByLabel('Max. stock').fill('10');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('link', { name: 'Product 03', exact: true })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(25);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('inventory-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});

test('create, edit, stock adjustments, conflict feedback and delete', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/products');
  await page.getByRole('link', { name: 'Add product', exact: true }).click();
  await page.getByLabel('Product name').fill('Safety glasses');
  await page.getByLabel('Unit price').fill('25.50');
  await page.getByLabel('Available stock').fill('0');
  await page.getByRole('button', { name: 'Create product' }).click();
  await expect(page.getByRole('heading', { name: 'Safety glasses', exact: true })).toBeVisible();
  await expect(page.locator('.stock-badge')).toHaveText('0 units');
  await page.getByLabel('Quantity', { exact: true }).fill('12');
  await page.getByRole('button', { name: /Add stock/ }).click();
  await expect(page.locator('.stock-badge')).toHaveText('12 units');
  await page.getByLabel('Quantity', { exact: true }).fill('3');
  await page.getByRole('button', { name: /Remove stock/ }).click();
  await expect(page.locator('.stock-badge')).toHaveText('9 units');
  await page.getByLabel('Quantity', { exact: true }).fill('99');
  await page.getByRole('button', { name: /Remove stock/ }).click();
  await expect(page.getByRole('alert')).toContainText('Insufficient stock.');
  await expect(page.locator('.stock-badge')).toHaveText('9 units');
  await page.getByRole('link', { name: 'Edit product', exact: true }).click();
  await page.getByLabel('Product name').fill('Safety glasses updated');
  await page.getByLabel('Unit price').fill('30.00');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByRole('heading', { name: 'Safety glasses updated', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.product-facts')).toContainText('30.00');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete product', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Product inventory' })).toBeVisible();
  await page.getByLabel('Search products').fill('Safety glasses updated');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('heading', { name: 'No products found' })).toBeVisible();
  expect(errors).toEqual([]);
});
