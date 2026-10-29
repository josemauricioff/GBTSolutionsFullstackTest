# Products Web

Angular 22.2.3 frontend for GBTSolutionsTest. The application uses all nine product API endpoints and server-side pagination.

## Run

Start the ASP.NET Core API on `http://localhost:5100`, then run these commands in this directory:

```powershell
npm ci
npm start
```

Open `http://localhost:4200`. Use `npm start -- --open` to open it automatically. Change `proxy.conf.json` if the API address differs.

## Build and unit tests

```powershell
npm run build
npm test
```

The production bundle is written to `dist/products-web/browser`. Unit tests use Angular TestBed, Vitest, jsdom and HTTP request testing. They cover all API operations, pagination controls, filter resets, empty/error states, product validation, duplicate-submission prevention and stock refreshes.

## Browser tests

The optional Playwright suite checks paginated navigation, filtering and CRUD/stock workflows with intercepted API responses. It is independent of SQL Server and does not replace backend integration tests.

```powershell
npx playwright install chromium
npm run test:e2e
```

To use an installed Chrome instead, set `$env:PLAYWRIGHT_CHANNEL='chrome'` before running the browser suite. Tests start a separate Angular dev server on port 4205.

## Source structure

- `src/app/core`: typed product models, HTTP API service and API error formatting.
- `src/app/shared`: reusable pagination and form validators.
- `src/app/features/products`: list, creation/editing form and product details with stock actions.
- `src/app/app.routes.ts`: lazy-loaded application routes.
- `e2e`: browser workflow tests with an API fixture.

Page, page size and filters are kept in URL query parameters. Filtering and page-size changes reset page 1. Mutations are followed by API reads; the client does not invent stock totals or generate product identifiers. External changes can be fetched using Refresh.

All UI text and code identifiers are in English. No external UI framework, font CDN, authentication service or API key is required.

For an already running server on port 4205, set PLAYWRIGHT_EXTERNAL_SERVER=1 to skip the automatic dev-server startup.
