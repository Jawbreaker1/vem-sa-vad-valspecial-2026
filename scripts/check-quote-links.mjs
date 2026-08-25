import { loadQuotes } from './load-quotes.mjs';
import { readFileSync } from 'node:fs';

const mediaEvidence = JSON.parse(readFileSync(
  new URL('../content/media-quote-verifications.json', import.meta.url),
  'utf8',
));
const sources = [
  ...loadQuotes().flatMap((quote) => [
    quote.source,
    ...(quote.aftermath?.sources ?? []),
  ]),
  ...mediaEvidence.map((evidence) => ({
    publisher: `${evidence.publisher} (ordalydelsebevis)`,
    url: evidence.url,
  })),
];
const uniqueSources = [...new Map(sources.map((source) => [source.url, source])).values()];
const results = [];
let cursor = 0;

async function worker() {
  while (cursor < uniqueSources.length) {
    const source = uniqueSources[cursor];
    cursor += 1;

    try {
      const response = await fetch(source.url, {
        redirect: 'follow',
        headers: { 'user-agent': 'Who-Said-What quote-source validator/0.1' },
        signal: AbortSignal.timeout(15_000),
      });
      results.push({
        source,
        status: response.status,
        ok: response.ok,
        warning: response.status === 403 || response.status === 429,
      });
      await response.body?.cancel();
    } catch (error) {
      results.push({ source, status: 'ERR', ok: false, warning: false, error });
    }
  }
}

await Promise.all(Array.from({ length: Math.min(6, uniqueSources.length) }, worker));
results.sort((left, right) => left.source.url.localeCompare(right.source.url, 'sv'));

for (const result of results) {
  const marker = result.ok ? '✓' : result.warning ? '⚠' : '✗';
  console.log(`${marker} ${String(result.status).padEnd(3)} ${result.source.publisher} — ${result.source.url}`);
}

const failures = results.filter((result) => !result.ok && !result.warning);
const warnings = results.filter((result) => result.warning);

console.log(
  `\nKällkontroll: ${results.length - failures.length - warnings.length} nåbara · ${warnings.length} blockerade eller strypta · ${failures.length} fel.`,
);

if (failures.length) process.exit(1);
