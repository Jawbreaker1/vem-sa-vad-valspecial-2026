import rawQuotes from '@/content/quotes.json';

export type PartyId = 'S' | 'M' | 'SD' | 'V' | 'C' | 'KD' | 'L' | 'MP';

export type Quote = {
  id: string;
  party: PartyId;
  quote: string;
  speaker: string;
  speakerRole: string;
  speakerImage: string | null;
  date: string;
  context: string;
  source: {
    title: string;
    publisher: string;
    url: string;
  };
  editorialNote?: string;
  reviewStatus: 'candidate' | 'context-checked' | 'primary-source-checked' | 'approved' | 'rejected';
};

export const quotes = rawQuotes as Quote[];
