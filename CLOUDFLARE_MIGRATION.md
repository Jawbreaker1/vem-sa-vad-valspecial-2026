# Cloudflare migration

Status: **staging verified; production cutover not started**.

The live site at [vemsavad.com](https://vemsavad.com) is still served by OpenAI
Sites. No DNS record, custom domain, Worker route, or Sites configuration was
changed during this phase.

## Safety checkpoints

- Live Sites version: `30`
- Live source commit: `98fe38387a64380142ef597a21c72a2eb3054082`
- Published rollback tag: `sites-prod-2026-08-27`
- Migration branch: `codex/cloudflare-staging`
- Isolated migration commit: `a08ff78`

Revert the migration code with a normal revert commit:

```sh
git switch codex/cloudflare-staging
git revert a08ff78
```

The immutable Sites baseline can also be checked out on a new branch without
moving or rewriting existing history:

```sh
git switch -c codex/sites-baseline sites-prod-2026-08-27
```

## Isolated staging resources

- Worker: `vemsavad-cloudflare-staging`
- URL: <https://vemsavad-cloudflare-staging.johan-c99.workers.dev>
- D1 database: `vemsavad-cloudflare-staging`
- D1 binding: `DB`
- Region observed during verification: `WEUR`

The staging Worker has `workers_dev: true` and deliberately has no `routes` or
custom domain. Its D1 database contains test analytics only and must not be
reused as the production analytics database.

## Commands

```sh
npm run check
npm run check:cloudflare:staging
npm run build:cloudflare:staging
npx wrangler deploy --dry-run --config dist/server/wrangler.json
npm run deploy:cloudflare:staging
```

Apply schema migrations only to the named staging database:

```sh
npx wrangler d1 migrations apply vemsavad-cloudflare-staging --remote --config wrangler.jsonc
```

## Verification completed on 2026-08-27

- The existing quote validation, lint, and standard Sites build passed.
- `vinext check` reported 100% compatibility (6/6 checks).
- Wrangler packaged the generated Worker successfully with only `DB` and
  `ASSETS` bindings.
- The staging homepage, `/om`, `robots.txt`, `sitemap.xml`, imagery, music, and
  crowd samples returned the expected content types.
- All 127 files under `public/` returned successful responses from staging.
- The analytics endpoint accepted same-origin POST (`204`), rejected GET
  (`405`), and rejected a foreign Origin (`403`).
- D1 migrations and writes were verified against the staging database.
- Desktop gameplay covered start, loading, timeout, wrong answer, correct
  answer, source reveal, impatient next button, and the category wheel.
- A complete 12-question run was completed at a 390 × 844 mobile viewport,
  including the result screen. No horizontal overflow or browser console error
  was observed.
- A live Worker error-only tail stayed empty during final route and API smoke
  tests.
- `vemsavad.com` returned the production game before and after staging deploy.

## Remaining production-cutover phase

1. Create a separate production D1 database with EU jurisdiction.
2. Export the Sites analytics totals and import them into that database.
3. Deploy a production-named Worker on `workers.dev`, still without a domain.
4. Repeat the HTTP, D1, desktop, mobile, and log checks against that Worker.
5. Record the current DNS values immediately before cutover.
6. Attach `vemsavad.com` only after the production Worker passes all checks.
7. Monitor errors and analytics after cutover while keeping Sites intact.

If cutover later needs to be rolled back, restore the recorded Sites DNS
targets and keep the Cloudflare Worker isolated. Do not use force-push or
history-rewriting Git commands.
