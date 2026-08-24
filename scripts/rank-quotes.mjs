import { approvalGateFailures, quotePriority, quoteThemes, quoteTier } from './quote-quality.mjs';
import { loadQuotes } from './load-quotes.mjs';

const quotes = loadQuotes();
const parties = ['S', 'M', 'SD', 'V', 'C', 'KD', 'L', 'MP'];

const ranked = quotes
  .filter((quote) => quote.reviewStatus !== 'rejected')
  .map((quote) => ({
    ...quote,
    priority: quotePriority(quote),
    gateFailures: approvalGateFailures(quote),
  }))
  .sort((left, right) => right.priority - left.priority || left.party.localeCompare(right.party, 'sv'));

const counts = Object.fromEntries(
  parties.map((party) => [
    party,
    {
      approved: quotes.filter((quote) => quote.party === party && quote.reviewStatus === 'approved').length,
      pipeline: quotes.filter((quote) => quote.party === party && !['approved', 'rejected'].includes(quote.reviewStatus)).length,
    },
  ]),
);

console.log('\nCITATBANKENS REDAKTIONELLA RANKING\n');
console.log('Poäng  Klass  Parti  Status                     Talare                  Citat');
console.log('─────  ─────  ─────  ─────────────────────────  ──────────────────────  ─────');

for (const quote of ranked) {
  const text = quote.quote.length > 74 ? `${quote.quote.slice(0, 71)}…` : quote.quote;
  console.log(
    `${String(quote.priority).padStart(3)}    ${quoteTier(quote.priority).padEnd(5)}  ${quote.party.padEnd(5)}  ${quote.reviewStatus.padEnd(24)}  ${quote.speaker.padEnd(22)}  ${text}`,
  );
  if (quote.reviewStatus !== 'approved' && quote.gateFailures.length) {
    console.log(`       ↳ kvar: ${quote.gateFailures.join('; ')}`);
  }
}

console.log('\nTÄCKNING PER PARTI\n');
for (const party of parties) {
  console.log(`${party.padEnd(3)} ${String(counts[party].approved).padStart(2)} godkända · ${String(counts[party].pipeline).padStart(2)} i granskningskö`);
}

console.log('\nTÄCKNING PER FRÅGETEMA\n');
for (const theme of quoteThemes) {
  const approvedForTheme = quotes.filter(
    (quote) => quote.theme === theme && quote.reviewStatus === 'approved',
  ).length;
  console.log(`${theme.padEnd(15)} ${String(approvedForTheme).padStart(2)} godkända`);
}

const approved = quotes.filter((quote) => quote.reviewStatus === 'approved').length;
const pipeline = quotes.filter((quote) => !['approved', 'rejected'].includes(quote.reviewStatus)).length;
console.log(`\nTotalt: ${quotes.length} · godkända: ${approved} · granskningskö: ${pipeline}\n`);
