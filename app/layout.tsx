import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vem sa vad? – Valspecial 2026',
  description: 'Koppla autentiska politiska citat till rätt svenskt riksdagsparti.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Vem sa vad? – Valspecial 2026',
    description: 'Åtta oväntade politikercitat. Kan du koppla alla till rätt parti?',
    locale: 'sv_SE',
    type: 'website',
    images: [
      {
        url: '/og-v2.png',
        width: 1536,
        height: 1024,
        alt: 'Den färgsprakande gameshow-scenen för Vem sa vad?',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vem sa vad? – Valspecial 2026',
    description: 'Åtta oväntade politikercitat. Kan du koppla alla till rätt parti?',
    images: ['/og-v2.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
