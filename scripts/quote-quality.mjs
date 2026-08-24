export const scoreKeys = [
  'fame',
  'humor',
  'surprise',
  'misdirection',
  'relevance',
  'standaloneClarity',
  'sourceStrength',
];

export const verificationKeys = [
  'exactWording',
  'speakerIdentity',
  'date',
  'context',
  'primarySource',
];

export const quoteThemes = [
  'classic',
  'grodcircus',
  'aged-poorly',
  'disguise',
  'duel',
  'word-picture',
];

const primarySourceTypes = new Set([
  'riksdag-protocol',
  'official-speech',
  'official-party-page',
  'government-page',
  'official-audio-video',
  'public-service-recording',
]);

const contribution = (rating, weight) => (Number(rating) / 5) * weight;

export function quotePriority(quote) {
  const scores = quote?.editorial?.scores ?? {};
  const strongerHook = Math.max(Number(scores.fame) || 0, Number(scores.humor) || 0);
  const secondHook = Math.min(Number(scores.fame) || 0, Number(scores.humor) || 0);

  const total =
    contribution(strongerHook, 25) +
    contribution(secondHook, 5) +
    contribution(scores.surprise, 20) +
    contribution(scores.misdirection, 15) +
    contribution(scores.relevance, 12) +
    contribution(scores.standaloneClarity, 10) +
    contribution(scores.sourceStrength, 13);

  return Math.round(total);
}

export function quoteTier(score) {
  if (score >= 85) return 'A+';
  if (score >= 78) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'reserv';
}

export function approvalGateFailures(quote) {
  const failures = [];
  const verification = quote?.verification ?? {};

  for (const key of verificationKeys) {
    if (verification[key] !== true) failures.push(`verification.${key} är inte godkänd`);
  }

  if (!primarySourceTypes.has(quote?.source?.type)) {
    failures.push('källtypen är inte godkänd som primär eller ordagrann originalupptagning');
  }

  const priority = quotePriority(quote);
  if (priority < 60) failures.push(`redaktionell prioritet ${priority}/100 är under gränsen 60`);

  if ((quote?.editorial?.scores?.sourceStrength ?? 0) < 4) {
    failures.push('källstyrkan är lägre än 4/5');
  }

  if ((quote?.editorial?.scores?.standaloneClarity ?? 0) < 3) {
    failures.push('citatet fungerar för dåligt fristående');
  }

  if (quote?.theme === 'aged-poorly') {
    const aftermath = quote?.aftermath;
    if (!aftermath) {
      failures.push('temat ”Det där åldrades… sådär” saknar en senare belagd händelse');
    } else {
      if (!primarySourceTypes.has(aftermath?.source?.type)) {
        failures.push('den senare händelsen saknar godkänd primärkälla');
      }
      if (!aftermath?.source?.locator) {
        failures.push('den senare källan saknar en tydlig locator');
      }
      if (!aftermath?.date || aftermath.date <= quote.date) {
        failures.push('den senare händelsen måste ha ett datum efter originalcitatet');
      }
    }
  }

  return failures;
}

export function isPrimarySourceType(type) {
  return primarySourceTypes.has(type);
}
