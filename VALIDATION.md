# Fullstack validation

The delivery uses the user's attached GBTSolutionsTest source as its base. The frontend and pagination extension were verified on 2026-10-29.

## Successful checks

- The complete .NET solution compiled with .NET SDK 10.0.403.
- 94 backend test cases passed without SQL Server: 72 Domain/Application unit cases and 22 HTTP/persistence-model cases.
- Angular 22.2.3 production build passed with strict TypeScript and Angular template checking enabled. Initial JavaScript and CSS total approximately 272 kB before compression.
- 26 frontend unit tests passed across seven files using Vitest and jsdom.
- Two Playwright browser tests passed in installed Chrome against the production Angular bundle, with API requests intercepted by a test fixture.
- Desktop and mobile list screenshots were inspected. The mobile layout keeps filters readable and makes wide table columns horizontally scrollable without overflowing the page.
- Validated frontend source files were compared by hash with the delivered source; they match.
- The solution file loads successfully, including frontend solution items. The PowerShell verification script passes syntax parsing.

Browser workflows cover pagination, page-size changes, combined filters, creation, editing, stock increments/decrements, insufficient-stock feedback, deletion and empty results. Browser assertions also check for uncaught page errors.

The EF model still matches the existing migration snapshot. No new database migration is required. Identifiers, sequence limits, column types, constraints and initial seed products are preserved.

## SQL Server validation still required

The 22 real-database Gherkin cases compile, including the new pagination scenarios, but were not run in this execution environment. Access to the user's LocalDB instance registry configuration is denied here. The browser API fixture is not evidence of real SQL Server integration. Run the complete backend suite on the user's machine before submission:

```powershell
dotnet test GBTSolutionsTest.slnx
```

The LocalDB instance `GBTSolutionsTest` must be available, or `BDD_CONNECTION_STRING` must identify another disposable SQL Server instance whose login can create, alter and drop test databases.

## Execution environment notes

The .NET packages were restored from the machine's existing NuGet cache. NuGet auditing was disabled for this offline restore; package references were not upgraded by this extension.

The frontend was built and tested in a shorter working path because dependency extraction in the original long workspace path failed. Node.js 24.19.0 and npm 11.17.0 were used. A writable workspace TEMP/TMP directory was needed for the sandbox's Angular test runner. Production sources and package manifests are delivered with the verified dependency lockfile.

The automatic Angular dev-server teardown did not finish inside this sandbox, so the final browser run used an externally managed static server for the production bundle, `PLAYWRIGHT_EXTERNAL_SERVER=1`, and `PLAYWRIGHT_CHANNEL=chrome`. The final build, unit-test and browser-test commands all completed successfully with exit code 0. These environment settings are validation workarounds, not application requirements.

## Commands used

```powershell
dotnet test GBTSolutionsTest.slnx --no-restore --filter 'FullyQualifiedName!~ProductInventoryManagementFeature' -m:1 -nr:false -p:UseSharedCompilation=false -p:ReqnrollGenerationTaskFactory=AssemblyTaskFactory
npm run build
npm test
npm run test:e2e
```

Generated binaries, installed dependencies, screenshots and test reports are not included in the source archive.
