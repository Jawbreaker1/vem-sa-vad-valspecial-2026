import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vem sa vad? – Valspecial 2026',
  description: 'Koppla autentiska politiska citat i sex temakategorier till rätt svenskt riksdagsparti.',
  applicationName: 'Vem sa vad?',
  category: 'spel',
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Vem sa vad? – Valspecial 2026',
    description: '24 frågor per omgång, slumpade ur en källgranskad citatbank. Kan du koppla dem till rätt parti?',
    siteName: 'Vem sa vad?',
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
    description: '24 frågor per omgång, slumpade ur en källgranskad citatbank. Kan du koppla dem till rätt parti?',
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
