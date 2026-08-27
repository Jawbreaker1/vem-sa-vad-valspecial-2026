# Cloudflare migration

Status: **Cloudflare production is live and verified on
[vemsavad.com](https://vemsavad.com)**.

The public hostname is now a Custom Domain of the production Worker. The last
OpenAI Sites deployment is intentionally still available on its canonical URL
as an independent rollback copy; it was not deleted or modified during the
cutover.

## Safety checkpoints

- Last live Sites version: `30`
- Sites source commit: `98fe38387a64380142ef597a21c72a2eb3054082`
- Immutable Sites rollback tag: `sites-prod-2026-08-27`
- Immutable pre-cutover tag: `cloudflare-prod-ready-2026-08-27`
- Verified live tag: `cloudflare-prod-live-2026-08-27`
- Production-preparation branch: `codex/cloudflare-production-prep`
- Staging migration commit: `a08ff78`
- Live Worker version: `4a5e4984-0f39-4839-ad00-bf12bac47c38`

The intact Sites fallback is available at
<https://vem-sa-vad-valspecial-2026.jawbreakerz.chatgpt.site/>. Its artifact is
distinct from the live Worker artifact, which proves that it remains an
independent rollback origin.

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
- Final isolated test data: 1 aggregate row and 9 visits

Staging contains test analytics only and is never reused by production.

### Production

- Worker: `vemsavad-cloudflare-production`
- Direct URL: <https://vemsavad-cloudflare-production.johan-c99.workers.dev>
- Custom Domain: <https://vemsavad.com>
- D1 database: `vemsavad-production`
- D1 ID: `2c6d8946-58d6-433f-90cc-4d7bacdeb7a6`
- D1 jurisdiction: `eu`
- Region observed during verification: `EEUR`
- Bindings: `ASSETS` and production `DB` only
- Live Worker version: `4a5e4984-0f39-4839-ad00-bf12bac47c38`

The temporary `vemsavad.com/*` Worker Route used while investigating the old
Sites routing was removed after cutover. The Custom Domain is the only custom
production trigger.

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

## Verification before cutover on 2026-08-27

- Quote validation, lint, the standard Sites build, and the production Worker
  dry-run passed.
- `vinext check` reported 100% compatibility (6/6 checks).
- All 127 files under `public/` and all 32 generated client assets returned
  byte-identical content with correct MIME types: 159/159 passed.
- All five MP3 files matched their local SHA-256 sums. Cloudflare Static Assets
  returns the complete small MP3 rather than a `206` byte range; this is a
  performance note, not a playback or release blocker.
- The analytics endpoint rejected GET (`405`) and foreign-origin POST (`403`).
  Browser visits wrote only to the production D1; staging stayed isolated.
- Desktop QA covered start/loading, sound toggle, timeout, correct and wrong
  answers, time and streak scoring, source reveals, all three category wheels,
  a complete 12-question round, local high score, result screen, and share UI.
- iPhone portrait QA at 390 x 844 showed the complete start logo, icon-only
  About/sound controls, all eight parties, cable selection, a fixed visible
  `Svara` control, the reveal card, source, and next control without horizontal
  displacement.
- The full game used no extra backend calls between questions. Gameplay remains
  client-side: dynamic Worker usage is one page response plus one analytics
  write per new browser session, while static assets use Cloudflare's asset
  delivery.

An initial `vemsavad.com/*` Worker Route deliberately caused no traffic change.
The previous OpenAI Sites setup used Cloudflare for SaaS custom-hostname
routing, whose orange-cloud O2O behavior does not invoke a route matching the
customer hostname. The new Worker is the origin, so the production configuration
uses Cloudflare's recommended Custom Domain instead.

## Completed cutover record

Immediately before DNS cutover, the latest Sites analytics snapshot was copied
to production D1 with exact absolute values:

- 16 aggregate day/country rows
- 155 visits
- date range `2026-08-25` through `2026-08-27`

The exact former Sites apex records were saved for rollback:

- apex A `172.66.3.26`, proxied, automatic TTL
- apex A `162.159.143.30`, proxied, automatic TTL

Only those two apex A records were removed. Both existing verification TXT
records were preserved. Wrangler then attached `vemsavad.com` as the Custom
Domain of `vemsavad-cloudflare-production` and deployed version
`4a5e4984-0f39-4839-ad00-bf12bac47c38`.

Post-cutover verification established:

- `vemsavad.com` and the direct `workers.dev` URL returned byte-identical HTML,
  deployment ID `d7fa8d39-7773-4e3d-a319-1a49c3453651`, and client bundle
  `index-CRY6NKvf.js`.
- The intact Sites fallback still returned its separate artifact, deployment ID
  `1eef0a66-1037-40aa-9108-7b4109dacb10` and bundle `index-T5_7HQvb.js`.
- `/`, `/om`, `robots.txt`, and `sitemap.xml` returned `200`; an unknown route
  returned `404`.
- The real analytics endpoint `/api/analytics/page-view` returned `405` for GET,
  `204` for OPTIONS, and `403` for a foreign-origin POST.
- A representative leader image and the crowd-cheer MP3 returned `200` with the
  expected MIME types.
- Fresh public-hostname smoke tests passed in iPhone portrait (390 x 844) and
  desktop (1280 x 720), including loading, all eight party controls, cable
  selection, timeout, explicit answer, correct/wrong reveal, sources, scoring,
  and zero horizontal overflow.
- The two deliberate Swedish browser sessions raised production D1 from 155 to
  157 visits (`SE` 40 to 42). Staging remained exactly 9 visits.
- A fresh error-filtered Worker tail saw no runtime errors during public route
  probes.
- Cloudflare DNS ended with exactly three records: the apex Worker record for
  `vemsavad-cloudflare-production` and the two preserved verification TXT
  records.
- The redundant exploratory Worker Route was removed, leaving only the
  production Custom Domain.

## Fast rollback

1. Remove the Worker Custom Domain `vemsavad.com`.
2. Restore both recorded proxied apex A records with automatic TTL:
   - `172.66.3.26`
   - `162.159.143.30`
3. Leave both verification TXT records in place.
4. Purge cache for hostname `vemsavad.com` only if a stale Worker response
   remains.
5. Verify that the public domain again matches the intact Sites deployment at
   its canonical URL.

Do not delete either Worker, either D1 database, the Sites deployment, or the
Sites domain configuration during rollback. A Custom Domain deletion leaves
its generated certificate behind; that is harmless and can be cleaned up only
after traffic is restored. Do not force-push or rewrite Git history.
