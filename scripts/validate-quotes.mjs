import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../content/quotes.json', import.meta.url));
const quotes = JSON.parse(readFileSync(file, 'utf8'));
const parties = ['S', 'M', 'SD', 'V', 'C', 'KD', 'L', 'MP'];
const reviewStates = [
  'candidate',
  'context-checked',
  'primary-source-checked',
  'approved',
  'rejected',
];
const errors = [];
const ids = new Set();

if (!Array.isArray(quotes)) errors.push('Roten måste vara en array.');

for (const [index, quote] of quotes.entries()) {
  const label = quote?.id ?? `post ${index + 1}`;
  if (!quote?.id || !/^[a-z0-9-]+$/.test(quote.id)) errors.push(`${label}: ogiltigt id.`);
  if (ids.has(quote.id)) errors.push(`${label}: dubblerat id.`);
  ids.add(quote.id);
  if (!parties.includes(quote.party)) errors.push(`${label}: okänt parti ${quote.party}.`);
  if (!quote.quote || quote.quote.trim().split(/\s+/).length > 25) {
    errors.push(`${label}: POC-citatet måste innehålla 1–25 ord.`);
  }
  if (!quote.speaker || !quote.speakerRole) errors.push(`${label}: talare och roll krävs.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(quote.date ?? '')) errors.push(`${label}: datum måste vara ISO-format.`);
  if ((quote.context ?? '').length < 80) errors.push(`${label}: sammanhanget är för tunt.`);
  if (!reviewStates.includes(quote.reviewStatus)) errors.push(`${label}: ogiltig granskningsstatus.`);
  if (!quote.source?.title || !quote.source?.publisher) errors.push(`${label}: källmetadata saknas.`);
  try {
    const source = new URL(quote.source?.url);
    if (source.protocol !== 'https:') errors.push(`${label}: källan måste använda HTTPS.`);
  } catch {
    errors.push(`${label}: käll-URL är ogiltig.`);
  }
}

for (const party of parties) {
  if (!quotes.some((quote) => quote.party === party && quote.reviewStatus === 'approved')) {
    errors.push(`Citatbanken saknar en godkänd, spelbar post för ${party}.`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `• ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Citatbanken är giltig: ${quotes.length} citat, samtliga åtta riksdagspartier representerade.`);
