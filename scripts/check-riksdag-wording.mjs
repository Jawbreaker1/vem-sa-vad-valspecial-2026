import { loadQuotes } from './load-quotes.mjs';
import { readFileSync } from 'node:fs';

const decodeHtml = (value) => value
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&aring;/g, 'å')
  .replace(/&Aring;/g, 'Å')
  .replace(/&auml;/g, 'ä')
  .replace(/&Auml;/g, 'Ä')
  .replace(/&ouml;/g, 'ö')
  .replace(/&Ouml;/g, 'Ö')
  .replace(/&eacute;/g, 'é')
  .replace(/&Eacute;/g, 'É')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&#34;/gi, '"')
  .replace(/&apos;|&#39;/gi, "'")
  .replace(/&ldquo;/gi, '“')
  .replace(/&rdquo;/gi, '”')
  .replace(/&lsquo;/gi, '‘')
  .replace(/&rsquo;/gi, '’')
  .replace(/&ndash;/gi, '–')
  .replace(/&mdash;/gi, '—')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));

const normalize = (value) => decodeHtml(value)
  .normalize('NFC')
  .replace(/\u00a0/g, ' ')
  .replace(/\u00ad/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const stripHtml = (html) => {
  const text = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/?(?:article|blockquote|br|div|h[1-6]|li|p|section|td|th|tr)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    // Äldre riksdagsprotokoll bevarar trycksakens layoutavstavningar.
    // Återskapa ordet före den vanliga blankstegsnormaliseringen.
    .replace(/([\p{L}])-\s*\r?\n\s*([\p{Ll}])/gu, '$1$2');

  return normalize(text);
};

const textSourceTypes = new Set([
  'riksdag-protocol',
  'official-speech',
  'official-party-page',
  'government-page',
]);
const approvedQuotes = loadQuotes().filter((quote) => quote.reviewStatus === 'approved');
const mediaEvidence = JSON.parse(readFileSync(
  new URL('../content/media-quote-verifications.json', import.meta.url),
  'utf8',
));
const evidenceById = new Map(mediaEvidence.map((entry) => [entry.id, entry]));
const configurationFailures = [];
const checks = approvedQuotes.flatMap((quote) => {
  if (textSourceTypes.has(quote.source.type)) {
    return [{ quote, url: quote.source.url, locator: quote.source.locator, evidenceType: 'originaltext' }];
  }

  const evidence = evidenceById.get(quote.id);
  if (!evidence) {
    configurationFailures.push(`${quote.id}: mediekällan saknar en kontrollerad skriftlig återgivning.`);
    return [];
  }
  if (evidence.quote !== quote.quote) {
    configurationFailures.push(`${quote.id}: citatet och mediebevisets sparade ordalydelse skiljer sig.`);
    return [];
  }

  return [{
    quote,
    url: evidence.url,
    locator: evidence.locator,
    evidenceType: 'medietranskription',
  }];
});
const results = new Array(checks.length);
let cursor = 0;

async function worker() {
  while (cursor < checks.length) {
    const index = cursor;
    cursor += 1;
    const check = checks[index];
    const { quote } = check;

    try {
      const response = await fetch(check.url, {
        headers: { 'user-agent': 'Who-Said-What exact-wording validator/0.1' },
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const sourceText = stripHtml(await response.text());
      const wording = normalize(quote.quote);
      results[index] = {
        check,
        quote,
        ok: sourceText.includes(wording),
        detail: sourceText.includes(wording) ? '' : 'ordalydelsen hittades inte som sammanhängande text',
      };
    } catch (error) {
      results[index] = {
        check,
        quote,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

await Promise.all(Array.from({ length: Math.min(6, checks.length) }, worker));

for (const result of results) {
  const evidenceLabel = result.check.evidenceType === 'medietranskription' ? ' [medietranskription]' : '';
  console.log(`${result.ok ? '✓' : '✗'} ${result.quote.id}${evidenceLabel} — ${result.check.locator}${result.detail ? `: ${result.detail}` : ''}`);
}

const failures = results.filter((result) => !result.ok);
console.log(`\nOrdalydelse mot original eller kontrollerad medietranskription: ${results.length - failures.length}/${approvedQuotes.length} godkända.`);
for (const failure of configurationFailures) {
  console.log(`✗ ${failure}`);
}
if (failures.length || configurationFailures.length) process.exit(1);
