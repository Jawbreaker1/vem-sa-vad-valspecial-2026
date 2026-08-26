import type { Metadata } from 'next';
import Link from 'next/link';
import { quotes } from '@/app/quotes';
import styles from './page.module.css';

const siteUrl = 'https://vemsavad.com';
const approvedQuotes = quotes.filter((quote) => quote.reviewStatus === 'approved');
const years = approvedQuotes.map((quote) => Number.parseInt(quote.date.slice(0, 4), 10));
const firstYear = Math.min(...years);
const lastYear = Math.max(...years);
const partyCount = new Set(approvedQuotes.map((quote) => quote.party)).size;

export const metadata: Metadata = {
  title: 'Om spelet och källorna | Vem sa vad?',
  description:
    'Så fungerar Vem sa vad?, hur de politiska citaten väljs och hur varje ordalydelse, talare, tidpunkt och källa granskas.',
  alternates: {
    canonical: '/om',
  },
  openGraph: {
    title: 'Om spelet och källorna | Vem sa vad?',
    description:
      'Läs om spelupplägget och den källgranskning som ligger bakom Vem sa vad? – Valspecial 2026.',
    url: '/om',
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
    title: 'Om spelet och källorna | Vem sa vad?',
    description: 'Så fungerar spelet och så granskas citaten och källorna.',
    images: ['/og-v3.jpg'],
  },
};

const aboutPageStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': `${siteUrl}/om#page`,
  url: `${siteUrl}/om`,
  name: 'Om spelet och källorna',
  description:
    'Information om spelupplägget, urvalet av politiska citat och källgranskningen bakom Vem sa vad? – Valspecial 2026.',
  inLanguage: 'sv-SE',
  isPartOf: {
    '@id': `${siteUrl}/#website`,
  },
  about: {
    '@id': `${siteUrl}/#game`,
  },
};

const serializedAboutPageData = JSON.stringify(aboutPageStructuredData).replace(/</g, '\\u003c');

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <script
        id="about-page-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializedAboutPageData }}
      />

      <div className={styles.lights} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <article className={styles.showcard}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Bakom kulisserna</p>
          <h1>Om spelet och källorna</h1>
          <p className={styles.lead}>
            <strong>Vem sa vad?</strong> är en fristående svensk citat-gameshow där du kopplar
            verkliga politiska uttalanden till rätt riksdagsparti. Det är byggt för skratt,
            förvåning och den där lilla tankeställaren när magkänslan visar sig ha fel.
          </p>
          <div className={styles.actions}>
            <Link className={styles.playButton} href="/">
              Spela nu <span aria-hidden="true">→</span>
            </Link>
            <a
              className={styles.linkButton}
              href="https://www.linkedin.com/in/johan-engwall-89604a5/"
              target="_blank"
              rel="noreferrer"
            >
              Johan Engwall på LinkedIn <span aria-hidden="true">↗</span>
            </a>
          </div>
        </header>

        <section className={styles.stats} aria-label="Spelet i korthet">
          <div>
            <strong>{partyCount}</strong>
            <span>riksdagspartier</span>
          </div>
          <div>
            <strong>12</strong>
            <span>frågor per omgång</span>
          </div>
          <div>
            <strong>4</strong>
            <span>snabba akter</span>
          </div>
          <div>
            <strong>{firstYear}–{lastYear}</strong>
            <span>citatens tidsspann</span>
          </div>
        </section>

        <div className={styles.contentGrid}>
          <section className={styles.panel}>
            <span className={styles.number}>01</span>
            <h2>Så fungerar spelet</h2>
            <p>
              Du får ett citat utan partibeteckning och kopplar den sprakande kabeln till det
              parti du tror står bakom orden. Rundan består av fyra akter med tre frågor i
              varje. Mellan akterna väljer kategorihjulet nästa sorts citat.
            </p>
            <p>
              Rätt svar, snabbhet och flera rätt i rad ger poäng. Efter varje svar visas
              talaren, datumet, sammanhanget och en länk till originalkällan.
            </p>
          </section>

          <section className={styles.panel}>
            <span className={styles.number}>02</span>
            <h2>Så väljs citaten</h2>
            <p>
              Urvalet prioriterar citat som är kända, roliga, oväntade eller lätta att
              misstolka när man inte ser vem som talar. Poängen är inte att hitta extrema
              undantag, privata felsägningar eller politiskt skvaller.
            </p>
            <p>
              Uttalandena kommer från officiella eller offentligt dokumenterade sammanhang och
              från personer som företrädde sitt parti när citatet yttrades.
            </p>
          </section>

          <section className={`${styles.panel} ${styles.wide}`}>
            <span className={styles.number}>03</span>
            <h2>Så granskas källorna</h2>
            <p>
              Ett citat blir spelbart först när ordalydelse, talare, datum, sammanhang och
              primärkälla har kontrollerats. Källan visas efter svaret tillsammans med en så
              precis hänvisning som materialet medger, till exempel anförandenummer, dokument,
              tidskod eller publiceringsdatum.
            </p>
            <div className={styles.checklist}>
              <span>✓ Exakt ordalydelse</span>
              <span>✓ Rätt talare och parti</span>
              <span>✓ Datum och sammanhang</span>
              <span>✓ Direktlänk till originalkällan</span>
            </div>
            <p>
              När det finns ett intressant och verifierbart efterspel kan du även öppna
              <em> Vad hände sedan?</em> och läsa mer. Det kan handla om en ursäkt, en
              omsvängning, ett politiskt resultat eller att formuleringen levde vidare.
            </p>
          </section>

          <section className={styles.panel}>
            <span className={styles.number}>04</span>
            <h2>Källor i första hand</h2>
            <p>Vi prioriterar material där uttalandet går att kontrollera direkt:</p>
            <ul>
              <li>riksdagens protokoll och dokument,</li>
              <li>officiella tal och partisidor,</li>
              <li>regeringens, myndigheters och institutioners publiceringar,</li>
              <li>officiellt ljud och video samt public service-inspelningar.</li>
            </ul>
          </section>

          <section className={styles.panel}>
            <span className={styles.number}>05</span>
            <h2>Historiska ord är historiska</h2>
            <p>
              Att ett parti eller en företrädare sade något ett visst år betyder inte att det
              är partiets politik i dag. Därför visas årtal och sammanhang tydligt. Spelet mäter
              vem du känner igen bakom orden – inte vad du själv röstar på.
            </p>
          </section>

          <section className={`${styles.panel} ${styles.wide}`}>
            <span className={styles.number}>06</span>
            <h2>Oberoende, integritet och formatet framåt</h2>
            <p>
              Spelet är fristående och har ingen koppling till de politiska partierna. Lokala
              rekord sparas i din egen webbläsare. Spelets egen besöksräknare lagrar endast
              aggregerade sessionstarter per dag och land – inte IP-adresser, svar eller poäng.
            </p>
            <p>
              Samma gameshow-format kan också användas för andra citatvärldar: filmrepliker,
              musik, kultur och sociala medier. Kärnan är densamma – ett citat, flera möjliga
              avsändare och ett tydligt avslöjande med källa och sammanhang.
            </p>
          </section>
        </div>

        <footer className={styles.footer}>
          <div>
            <small>Designed by</small>
            <strong>Bird Disk Studios</strong>
          </div>
          <Link href="/">Tillbaka till spelet <span aria-hidden="true">→</span></Link>
        </footer>
      </article>
    </main>
  );
}
