import {
  approvalGateFailures,
  quotePriority,
  scoreKeys,
  verificationKeys,
} from './quote-quality.mjs';
import { loadQuotes } from './load-quotes.mjs';

const quotes = loadQuotes();
const parties = ['S', 'M', 'SD', 'V', 'C', 'KD', 'L', 'MP'];
const reviewStates = [
  'candidate',
  'context-checked',
  'primary-source-checked',
  'approved',
  'rejected',
];
const speakerTiers = ['party-leader', 'prime-minister', 'minister', 'official-spokesperson'];
const sourceTypes = [
  'riksdag-protocol',
  'official-speech',
  'official-party-page',
  'government-page',
  'official-audio-video',
  'public-service-recording',
  'secondary-lead',
];
const allowedTags = new Set([
  'famous',
  'funny',
  'surprising',
  'misdirection',
  'historical',
  'current',
  'metaphor',
  'policy',
  'debate-reply',
]);
const allowedRiskFlags = new Set([
  'context-dependent',
  'commonly-misattributed',
  'sensitive',
  'translation',
  'clip-needed',
  'date-uncertain',
]);
const errors = [];
const warnings = [];
const ids = new Set();
const normalizedQuotes = new Map();

if (!Array.isArray(quotes)) errors.push('Roten måste vara en array.');

for (const [index, quote] of quotes.entries()) {
  const label = quote?.id ?? `post ${index + 1}`;
  if (!quote?.id || !/^[a-z0-9-]+$/.test(quote.id)) errors.push(`${label}: ogiltigt id.`);
  if (ids.has(quote.id)) errors.push(`${label}: dubblerat id.`);
  ids.add(quote.id);

  const normalizedQuote = quote.quote
    ?.toLocaleLowerCase('sv')
    .replace(/[\p{P}\p{S}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalizedQuote) {
    const duplicate = normalizedQuotes.get(normalizedQuote);
    if (duplicate) errors.push(`${label}: samma citattext finns redan som ${duplicate}.`);
    normalizedQuotes.set(normalizedQuote, label);
  }

  if (!parties.includes(quote.party)) errors.push(`${label}: okänt parti ${quote.party}.`);
  const wordCount = quote.quote?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  if (wordCount < 1 || wordCount > 25) {
    errors.push(`${label}: spelcitatet måste innehålla 1–25 ord, men har ${wordCount}.`);
  }

  if (!quote.speaker || !quote.speakerRole) errors.push(`${label}: talare och roll krävs.`);
  if (!speakerTiers.includes(quote.speakerTier)) errors.push(`${label}: ogiltig talarnivå.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(quote.date ?? '')) {
    errors.push(`${label}: datum måste vara ISO-format.`);
  } else if (quote.date < '1994-01-01' || quote.date > '2026-12-31') {
    errors.push(`${label}: datumet ligger utanför spelperioden 1994–2026.`);
  }

  if ((quote.context ?? '').length < 80) errors.push(`${label}: sammanhanget är för tunt.`);
  if (!reviewStates.includes(quote.reviewStatus)) errors.push(`${label}: ogiltig granskningsstatus.`);
  if (!quote.source?.title || !quote.source?.publisher) errors.push(`${label}: källmetadata saknas.`);
  if (!sourceTypes.includes(quote.source?.type)) errors.push(`${label}: ogiltig källtyp.`);

  try {
    const source = new URL(quote.source?.url);
    if (source.protocol !== 'https:') errors.push(`${label}: källan måste använda HTTPS.`);
  } catch {
    errors.push(`${label}: käll-URL är ogiltig.`);
  }

  const tags = quote.editorial?.tags;
  if (!Array.isArray(tags) || !tags.length) {
    errors.push(`${label}: minst en redaktionell tagg krävs.`);
  } else {
    for (const tag of tags) if (!allowedTags.has(tag)) errors.push(`${label}: okänd tagg ${tag}.`);
    if (new Set(tags).size !== tags.length) errors.push(`${label}: dubblerade redaktionella taggar.`);
  }

  const riskFlags = quote.editorial?.riskFlags;
  if (!Array.isArray(riskFlags)) {
    errors.push(`${label}: riskFlags måste vara en array.`);
  } else {
    for (const flag of riskFlags) if (!allowedRiskFlags.has(flag)) errors.push(`${label}: okänd riskflagga ${flag}.`);
    if (new Set(riskFlags).size !== riskFlags.length) errors.push(`${label}: dubblerade riskflaggor.`);
  }

  if ((quote.editorial?.rationale ?? '').length < 30) {
    errors.push(`${label}: redaktionell motivering måste vara minst 30 tecken.`);
  }

  for (const key of scoreKeys) {
    const value = quote.editorial?.scores?.[key];
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      errors.push(`${label}: editorial.scores.${key} måste vara ett heltal 1–5.`);
    }
  }

  if ((quote.editorial?.scores?.fame ?? 0) >= 4 && (quote.editorial?.fameNote ?? '').length < 20) {
    errors.push(`${label}: citat med fame 4–5 behöver en fameNote som motiverar kändisskapet.`);
  }

  for (const key of verificationKeys) {
    if (typeof quote.verification?.[key] !== 'boolean') {
      errors.push(`${label}: verification.${key} måste vara true eller false.`);
    }
  }

  if (quote.verification?.lastChecked !== null && !/^\d{4}-\d{2}-\d{2}$/.test(quote.verification?.lastChecked ?? '')) {
    errors.push(`${label}: verification.lastChecked måste vara ISO-datum eller null.`);
  }

  if (quote.reviewStatus === 'approved') {
    if ((quote.source?.locator ?? '').length < 8) {
      errors.push(`${label}: godkända citat behöver en tydlig locator i källan.`);
    }
    for (const failure of approvalGateFailures(quote)) errors.push(`${label}: kan inte godkännas – ${failure}.`);
  } else if (quote.reviewStatus !== 'rejected' && quotePriority(quote) < 60) {
    warnings.push(`${label}: prioritet ${quotePriority(quote)}/100; sannolik reserv om inte formuleringen stärks.`);
  }

  if (!['party-leader', 'prime-minister'].includes(quote.speakerTier) && quote.reviewStatus === 'approved') {
    warnings.push(`${label}: godkänt undantag från huvudregeln om parti-/regeringsledare.`);
  }
}

for (const party of parties) {
  const approvedForParty = quotes.filter(
    (quote) => quote.party === party && quote.reviewStatus === 'approved',
  );
  if (!approvedForParty.length) {
    errors.push(`Citatbanken saknar en godkänd, spelbar post för ${party}.`);
  } else if (approvedForParty.length < 4) {
    warnings.push(`${party}: bara ${approvedForParty.length} godkända citat; redaktionellt mål är minst 4.`);
  }
}

if (warnings.length) console.warn(warnings.map((warning) => `⚠ ${warning}`).join('\n'));

if (errors.length) {
  console.error(errors.map((error) => `• ${error}`).join('\n'));
  process.exit(1);
}

const approved = quotes.filter((quote) => quote.reviewStatus === 'approved');
const pipeline = quotes.filter((quote) => !['approved', 'rejected'].includes(quote.reviewStatus));
const averagePriority = approved.length
  ? Math.round(approved.reduce((sum, quote) => sum + quotePriority(quote), 0) / approved.length)
  : 0;

console.log(
  `Citatbanken är giltig: ${quotes.length} citat · ${approved.length} godkända · ${pipeline.length} i granskningskö · snittprioritet ${averagePriority}/100.`,
);
