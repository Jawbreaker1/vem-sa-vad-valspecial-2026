import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#041638',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://vemsavad.com'),
  title: 'Vem sa vad? – Valspecial 2026',
  description: 'Tolv autentiska politiska citat, fyra snabba akter och ett skoningslöst kategorihjul. Vem sa vad?',
  applicationName: 'Vem sa vad?',
  category: 'spel',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Vem sa vad? – Valspecial 2026',
    description: '12 citat i fyra snabba akter, slumpade ur en källgranskad citatbank. Kan du koppla dem till rätt parti?',
    url: '/',
    siteName: 'Vem sa vad?',
    locale: 'sv_SE',
    type: 'website',
    images: [
      {
        url: '/og-v3.jpg',
        width: 1200,
        height: 630,
        alt: 'Den färgsprakande gameshow-scenen för Vem sa vad?',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vem sa vad? – Valspecial 2026',
    description: '12 citat i fyra snabba akter, slumpade ur en källgranskad citatbank. Kan du koppla dem till rätt parti?',
    images: ['/og-v3.jpg'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
