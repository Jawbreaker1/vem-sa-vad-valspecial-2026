import rawQuotes from '@/content/quotes.json';
import centerLiberalChristianDemocratQuotes from '@/content/quote-batches/c-l-kd.json';
import socialDemocratModerateQuotes from '@/content/quote-batches/s-m.json';
import leftGreenSwedenDemocratQuotes from '@/content/quote-batches/v-mp-sd.json';

export type PartyId = 'S' | 'M' | 'SD' | 'V' | 'C' | 'KD' | 'L' | 'MP';

export type Quote = {
  id: string;
  party: PartyId;
  quote: string;
  speaker: string;
  speakerRole: string;
  speakerTier: 'party-leader' | 'prime-minister' | 'minister' | 'official-spokesperson';
  speakerImage: string | null;
  date: string;
  context: string;
  source: {
    title: string;
    publisher: string;
    url: string;
    type: 'riksdag-protocol' | 'official-speech' | 'official-party-page' | 'government-page' | 'official-audio-video' | 'public-service-recording' | 'secondary-lead';
    locator?: string;
  };
  editorialNote?: string;
  editorial: {
    tags: Array<'famous' | 'funny' | 'surprising' | 'misdirection' | 'historical' | 'current' | 'metaphor' | 'policy' | 'debate-reply'>;
    riskFlags: Array<'context-dependent' | 'commonly-misattributed' | 'sensitive' | 'translation' | 'clip-needed' | 'date-uncertain'>;
    rationale: string;
    fameNote?: string;
    scores: {
      fame: number;
      humor: number;
      surprise: number;
      misdirection: number;
      relevance: number;
      standaloneClarity: number;
      sourceStrength: number;
    };
  };
  verification: {
    exactWording: boolean;
    speakerIdentity: boolean;
    date: boolean;
    context: boolean;
    primarySource: boolean;
    lastChecked: string | null;
  };
  reviewStatus: 'candidate' | 'context-checked' | 'primary-source-checked' | 'approved' | 'rejected';
};

export const quotes = [
  ...rawQuotes,
  ...centerLiberalChristianDemocratQuotes,
  ...socialDemocratModerateQuotes,
  ...leftGreenSwedenDemocratQuotes,
] as Quote[];

const contribution = (rating: number, weight: number) => (rating / 5) * weight;

export function quotePriority(quote: Quote) {
  const scores = quote.editorial.scores;
  const strongerHook = Math.max(scores.fame, scores.humor);
  const secondHook = Math.min(scores.fame, scores.humor);

  return Math.round(
    contribution(strongerHook, 25) +
      contribution(secondHook, 5) +
      contribution(scores.surprise, 20) +
      contribution(scores.misdirection, 15) +
      contribution(scores.relevance, 12) +
      contribution(scores.standaloneClarity, 10) +
      contribution(scores.sourceStrength, 13),
  );
}
