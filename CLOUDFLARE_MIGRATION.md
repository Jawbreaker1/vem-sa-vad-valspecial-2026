# Cloudflare migration

Status: **isolated production candidate verified; domain cutover not started**.

The live site at [vemsavad.com](https://vemsavad.com) is still served by OpenAI
Sites. Its DNS record, Sites custom-domain attachment, and production deployment
remain unchanged. The Cloudflare candidate is available only on its separate
`workers.dev` address until the final route is attached.

## Safety checkpoints

- Live Sites version: `30`
- Live Sites source commit: `98fe38387a64380142ef597a21c72a2eb3054082`
- Immutable Sites rollback tag: `sites-prod-2026-08-27`
- Production-preparation branch: `codex/cloudflare-production-prep`
- Staging migration commit: `a08ff78`
- Production Worker version: `345eb712-aa7e-4f4f-85a9-942e81e86f31`

The Sites deployment and its canonical
`vem-sa-vad-valspecial-2026.jawbreakerz.chatgpt.site` URL stay intact after
cutover. The first cutover uses a Worker Route in front of the already proxied
apex hostname, not a DNS replacement or Worker Custom Domain. Removing that
single route therefore returns traffic to Sites without waiting for DNS.

The immutable Sites baseline can be inspected on a new branch without moving
or rewriting existing history:

```sh
git switch -c codex/sites-baseline sites-prod-2026-08-27
```

## Isolated resources

### Staging

- Worker: `vemsavad-cloudflare-staging`
- URL: <https://vemsavad-cloudflare-staging.johan-c99.workers.dev>
- D1 database: `vemsavad-cloudflare-staging`
- D1 ID: `074f7b6a-2ed3-4723-8ebd-ce0da541d7ae`
- Region observed during verification: `WEUR`

Staging contains test analytics only and is never reused by production.

### Production candidate

- Worker: `vemsavad-cloudflare-production`
- URL: <https://vemsavad-cloudflare-production.johan-c99.workers.dev>
- D1 database: `vemsavad-production`
- D1 ID: `2c6d8946-58d6-433f-90cc-4d7bacdeb7a6`
- D1 jurisdiction: `eu`
- Region observed during verification: `EEUR`
- Bindings: `ASSETS` and production `DB` only
- Routes/custom domains before cutover: none

## Commands

```sh
npm run check
npm run check:cloudflare:staging
npm run check:cloudflare:production
npm run deploy:cloudflare:production
```

Apply schema migrations only to an explicitly named database:

```sh
npx wrangler d1 migrations apply vemsavad-production --remote --config wrangler.jsonc
```

## Production-candidate verification on 2026-08-27

- Quote validation, lint, the standard Sites build, and the production Worker
  dry-run passed.
- `vinext check` reported 100% compatibility (6/6 checks).
- Wrangler deployed version `345eb712-aa7e-4f4f-85a9-942e81e86f31` with the
  expected production D1 and no route or custom domain.
- The homepage, `/om`, `robots.txt`, `sitemap.xml`, and a representative 404
  returned the expected statuses and content types.
- All 127 files under `public/` and all 32 generated client assets returned
  byte-identical content with correct MIME types: 159/159 passed.
- All five MP3 files matched their local SHA-256 sums. Cloudflare Static Assets
  currently returns the complete small MP3 rather than a `206` byte range; this
  is a performance note, not a playback or release blocker.
- The analytics endpoint rejected GET (`405`) and foreign-origin POST (`403`).
  Browser visits wrote only to the production D1; staging stayed isolated.
- The imported Sites analytics snapshot contained 16 aggregate day/country
  rows and 149 visits. A browser QA visit raised the candidate to 150. The
  absolute Sites totals will be synchronized again immediately before cutover
  so QA traffic cannot skew the production history.
- Desktop QA covered start/loading, sound toggle, timeout, correct and wrong
  answers, time and streak scoring, source reveals, all three category wheels,
  a complete 12-question round, local high score, result screen, and share UI.
- iPhone portrait QA at 390 x 844 showed the complete start logo, icon-only
  About/sound controls, all eight parties, cable selection, a fixed visible
  `Svara` control, the reveal card, source, and next control without horizontal
  displacement.
- The full game used no extra backend calls between questions; gameplay remains
  client-side. Dynamic Worker usage is one page response plus one analytics
  write per new browser session, while static assets are served by Cloudflare's
  asset cache.
- The Worker dashboard and live tail reported zero runtime errors during QA.
- `vemsavad.com` continued to return the Sites artifact throughout deployment
  and verification.

## Cutover and rollback

Immediately before cutover:

1. Read the latest aggregate `daily_visits` rows from Sites.
2. Upsert those absolute values into `vemsavad-production` and verify totals.
3. Record the current public DNS answers and confirm `vemsavad.com` still serves
   the Sites artifact.
4. Attach only the Worker Route `vemsavad.com/*` to
   `vemsavad-cloudflare-production`.

After cutover, verify `/`, `/om`, `robots.txt`, `sitemap.xml`, analytics, assets,
desktop/mobile gameplay, and the Worker error tail on the public hostname.

Fast rollback:

1. Delete only the Worker Route `vemsavad.com/*`.
2. Purge cache for hostname `vemsavad.com` if a stale Worker response remains.
3. Verify the domain again matches the intact Sites deployment.

Do not delete either Worker, either D1 database, the Sites deployment, or the
Sites domain configuration during rollback. Do not force-push or rewrite Git
history.
