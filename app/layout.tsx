import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = 'https://vemsavad.com';

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: 'Vem sa vad?',
      alternateName: 'Vem sa vad? – Valspecial 2026',
      description:
        'Ett svenskt, källgranskat citatspel där spelaren kopplar politiska citat till rätt riksdagsparti.',
      inLanguage: 'sv-SE',
      mainEntity: {
        '@id': `${siteUrl}/#game`,
      },
      publisher: {
        '@id': `${siteUrl}/#studio`,
      },
    },
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#studio`,
      name: 'Bird Disk Studios',
      url: `${siteUrl}/om`,
      founder: {
        '@id': `${siteUrl}/#creator`,
      },
    },
    {
      '@type': 'Person',
      '@id': `${siteUrl}/#creator`,
      name: 'Johan Engwall',
      sameAs: ['https://www.linkedin.com/in/johan-engwall-89604a5/'],
    },
    {
      '@type': 'WebApplication',
      '@id': `${siteUrl}/#game`,
      name: 'Vem sa vad? – Valspecial 2026',
      url: `${siteUrl}/`,
      description:
        'Ett snabbt politiskt citatspel i fyra akter. Koppla autentiska, källgranskade citat till rätt svenskt riksdagsparti.',
      applicationCategory: 'GameApplication',
      applicationSubCategory: 'Politiskt frågespel',
      operatingSystem: 'Webbläsare',
      browserRequirements: 'JavaScript och en modern webbläsare',
      inLanguage: 'sv-SE',
      isAccessibleForFree: true,
      image: `${siteUrl}/og-v3.jpg`,
      author: {
        '@id': `${siteUrl}/#creator`,
      },
      publisher: {
        '@id': `${siteUrl}/#studio`,
      },
      isPartOf: {
        '@id': `${siteUrl}/#website`,
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'SEK',
      },
      featureList: [
        'Tolv frågor i fyra snabba akter',
        'Källhänvisning och sammanhang efter varje svar',
        'Poäng för snabbhet och rätta svar i följd',
        'Fungerar på mobil och dator',
      ],
    },
  ],
};

const serializedStructuredData = JSON.stringify(structuredData).replace(/</g, '\\u003c');

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
      <body>
        <script
          id="vemsavad-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializedStructuredData }}
        />
        {children}
      </body>
    </html>
  );
}
