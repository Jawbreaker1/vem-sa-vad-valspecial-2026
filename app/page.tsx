'use client';

/* eslint-disable @next/next/no-img-element */

import {
  CSSProperties,
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PartyId, Quote, quotes } from './quotes';

type Party = {
  id: PartyId;
  name: string;
  shortName: string;
  logo: string;
  leaders: Array<{
    name: string;
    image: string;
  }>;
  color: string;
  ink: string;
};

type Answer = {
  quoteId: string;
  party: PartyId;
  chosen: PartyId;
  correct: boolean;
};

type Point = { x: number; y: number };
type Screen = 'intro' | 'question' | 'results';
type Phase = 'choosing' | 'reveal';
type Cue = 'start' | 'connect' | 'correct' | 'wrong';

const parties: Party[] = [
  {
    id: 'S',
    name: 'Socialdemokraterna',
    shortName: 'S',
    logo: '/party-logos/s.svg',
    leaders: [{ name: 'Magdalena Andersson', image: '/leaders/magdalena-andersson.webp' }],
    color: '#e52532',
    ink: '#fff',
  },
  {
    id: 'M',
    name: 'Moderaterna',
    shortName: 'M',
    logo: '/party-logos/m.webp',
    leaders: [{ name: 'Ulf Kristersson', image: '/leaders/ulf-kristersson.webp' }],
    color: '#1598d3',
    ink: '#fff',
  },
  {
    id: 'SD',
    name: 'Sverigedemokraterna',
    shortName: 'SD',
    logo: '/party-logos/sd.png',
    leaders: [{ name: 'Jimmie Åkesson', image: '/leaders/jimmie-akesson.webp' }],
    color: '#f5ca26',
    ink: '#102a56',
  },
  {
    id: 'V',
    name: 'Vänsterpartiet',
    shortName: 'V',
    logo: '/party-logos/v.svg',
    leaders: [{ name: 'Nooshi Dadgostar', image: '/leaders/nooshi-dadgostar.webp' }],
    color: '#d71933',
    ink: '#fff',
  },
  {
    id: 'C',
    name: 'Centerpartiet',
    shortName: 'C',
    logo: '/party-logos/c.png',
    leaders: [{ name: 'Elisabeth Thand Ringqvist', image: '/leaders/elisabeth-thand-ringqvist.webp' }],
    color: '#079447',
    ink: '#fff',
  },
  {
    id: 'KD',
    name: 'Kristdemokraterna',
    shortName: 'KD',
    logo: '/party-logos/kd.svg',
    leaders: [{ name: 'Ebba Busch', image: '/leaders/ebba-busch.webp' }],
    color: '#203c8d',
    ink: '#fff',
  },
  {
    id: 'L',
    name: 'Liberalerna',
    shortName: 'L',
    logo: '/party-logos/l.svg',
    leaders: [{ name: 'Simona Mohamsson', image: '/leaders/simona-mohamsson.webp' }],
    color: '#1265b0',
    ink: '#fff',
  },
  {
    id: 'MP',
    name: 'Miljöpartiet',
    shortName: 'MP',
    logo: '/party-logos/mp.svg',
    leaders: [
      { name: 'Amanda Lind', image: '/leaders/amanda-lind.webp' },
      { name: 'Daniel Helldén', image: '/leaders/daniel-hellden.webp' },
    ],
    color: '#69a942',
    ink: '#fff',
  },
];

const confetti = Array.from({ length: 72 }, (_, index) => ({
  left: (index * 37) % 101,
  drift: ((index * 71) % 260) - 130,
  delay: (index % 12) * 0.055,
  duration: 1.8 + (index % 7) * 0.16,
  rotation: 240 + (index % 9) * 95,
  color: ['#ffd136', '#f7254c', '#13a8ff', '#67d449', '#ffffff'][index % 5],
}));

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function partyById(id: PartyId) {
  return parties.find((party) => party.id === id) ?? parties[0];
}

function buildRound(bank: Quote[]) {
  const balanced = parties.flatMap((party) => {
    const candidates = bank.filter(
      (quote) => quote.party === party.id && quote.reviewStatus === 'approved',
    );
    if (!candidates.length) return [];
    return candidates[Math.floor(Math.random() * candidates.length)];
  });
  return shuffle(balanced);
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [phase, setPhase] = useState<Phase>('choosing');
  const [roundQuotes, setRoundQuotes] = useState<Quote[]>(quotes);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [selected, setSelected] = useState<PartyId | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [geometry, setGeometry] = useState<{
    start: Point;
    targets: Partial<Record<PartyId, Point>>;
  } | null>(null);
  const jackRef = useRef<HTMLSpanElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const current = roundQuotes[currentIndex] ?? quotes[0];
  const correctParty = partyById(current.party);
  const selectedParty = selected ? partyById(selected) : null;
  const wasCorrect = selected === current.party;
  const score = answers.filter((answer) => answer.correct).length;

  useEffect(() => {
    if (screen !== 'question') return;
    const measure = () => {
      const jack = jackRef.current?.getBoundingClientRect();
      if (!jack) return;
      const targets = Object.fromEntries(
        parties.map((party) => {
          const rect = document.querySelector<HTMLElement>(`[data-party="${party.id}"]`)?.getBoundingClientRect();
          return [
            party.id,
            rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.46 } : undefined,
          ];
        }),
      ) as Partial<Record<PartyId, Point>>;
      setGeometry({
        start: { x: jack.left + jack.width / 2, y: jack.top + jack.height / 2 },
        targets,
      });
    };
    const frame = requestAnimationFrame(measure);
    const settleTimer = window.setTimeout(measure, 420);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [screen, currentIndex, phase, selected]);

  useEffect(() => {
    if (phase !== 'reveal') return;
    const timer = window.setTimeout(() => nextButtonRef.current?.focus({ preventScroll: true }), 650);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const cable = useMemo(() => {
    if (screen !== 'question' || !geometry) return null;
    const start = geometry.start;
    let end = pointer ?? { x: start.x, y: start.y + 60 };

    if (!dragging && selected) {
      const target = geometry.targets[selected];
      if (target) end = target;
    }

    const verticalDistance = Math.abs(end.y - start.y);
    const bend = Math.max(72, verticalDistance * 0.58);
    return {
      path: `M ${start.x} ${start.y} C ${start.x} ${start.y + bend}, ${end.x} ${end.y - bend}, ${end.x} ${end.y}`,
      end,
    };
  }, [dragging, geometry, pointer, screen, selected]);

  function ensureAudio() {
    if (typeof window === 'undefined') return null;
    if (!audioRef.current) audioRef.current = new AudioContext();
    if (audioRef.current.state === 'suspended') void audioRef.current.resume();
    return audioRef.current;
  }

  function playCue(cue: Cue, force = false) {
    if (!soundOn && !force) return;
    const audio = ensureAudio();
    if (!audio) return;
    const now = audio.currentTime;

    const note = (
      frequency: number,
      offset: number,
      duration: number,
      type: OscillatorType = 'triangle',
      volume = 0.08,
    ) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(volume, now + offset + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + duration + 0.03);
    };

    if (cue === 'connect') {
      [510, 820, 640, 960, 720].forEach((frequency, index) => {
        note(frequency, index * 0.025, 0.055, 'square', 0.018);
      });
      note(160, 0, 0.16, 'sawtooth', 0.032);
      note(430, 0.11, 0.14, 'triangle', 0.045);
    }

    if (cue === 'start') {
      [262, 392, 523].forEach((frequency, index) => note(frequency, index * 0.09, 0.24));
      note(784, 0.29, 0.42, 'triangle', 0.1);
    }

    if (cue === 'correct') {
      [523, 659, 784, 1047].forEach((frequency, index) => note(frequency, index * 0.1, 0.38, 'triangle', 0.095));
      [523, 659, 784].forEach((frequency) => note(frequency, 0.46, 0.58, 'sine', 0.045));
    }

    if (cue === 'wrong') {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(155, now);
      oscillator.frequency.exponentialRampToValueAtTime(68, now + 0.55);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.64);
    }
  }

  function toggleSound() {
    if (soundOn) {
      setSoundOn(false);
      return;
    }
    setSoundOn(true);
    playCue('connect', true);
  }

  function startGame() {
    setRoundQuotes(buildRound(quotes));
    setAnswers([]);
    setCurrentIndex(0);
    setSelected(null);
    setPointer(null);
    setDragging(false);
    setPhase('choosing');
    setScreen('question');
    playCue('start');
  }

  function connectParty(party: PartyId) {
    if (phase !== 'choosing') return;
    setSelected(party);
    setPointer(null);
    setDragging(false);
    playCue('connect');
  }

  function submitAnswer() {
    if (phase !== 'choosing' || !selected) return;
    const correct = selected === current.party;
    setAnswers((previous) => [
      ...previous,
      { quoteId: current.id, party: current.party, chosen: selected, correct },
    ]);
    setPhase('reveal');
    playCue(correct ? 'correct' : 'wrong');
  }

  function startCable(event: PointerEvent<HTMLSpanElement>) {
    if (phase !== 'choosing') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelected(null);
    setDragging(true);
    setPointer({ x: event.clientX, y: event.clientY });
  }

  function moveCable(event: PointerEvent<HTMLSpanElement>) {
    if (!dragging || phase !== 'choosing') return;
    setPointer({ x: event.clientX, y: event.clientY });
  }

  function dropCable(event: PointerEvent<HTMLSpanElement>) {
    if (!dragging || phase !== 'choosing') return;
    const hit = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-party]');
    setDragging(false);
    setPointer(null);
    if (hit?.dataset.party) connectParty(hit.dataset.party as PartyId);
  }

  function cancelCable() {
    setDragging(false);
    setPointer(null);
  }

  function nextQuestion() {
    if (currentIndex === roundQuotes.length - 1) {
      setScreen('results');
      return;
    }
    setCurrentIndex((index) => index + 1);
    setSelected(null);
    setPointer(null);
    setDragging(false);
    setPhase('choosing');
    playCue('connect');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function returnHome() {
    setScreen('intro');
    setPhase('choosing');
    setSelected(null);
    setPointer(null);
    setDragging(false);
  }

  const soundButton = (
    <button
      className={`sound-button ${screen === 'question' ? 'in-game' : ''}`}
      aria-label={soundOn ? 'Stäng av ljud' : 'Slå på ljud'}
      aria-pressed={soundOn}
      title={soundOn ? 'Stäng av ljud' : 'Slå på ljud'}
      onClick={toggleSound}
    >
      <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span>
    </button>
  );

  if (screen === 'intro') {
    return (
      <main className="intro-screen">
        <div className="intro-image" aria-hidden="true" />
        <div className="sweep sweep-one" aria-hidden="true" />
        <div className="sweep sweep-two" aria-hidden="true" />
        <h1 className="intro-logo">
          <span className="intro-logo-main">Vem sa vad?</span>
          <span className="intro-logo-edition">
            <i aria-hidden="true">★</i>
            Valspecial 2026
            <i aria-hidden="true">★</i>
          </span>
        </h1>
        <div className="intro-kicker">8 partier · 8 primärkällor · 0 säkra kort</div>
        <button className="start-button" onClick={startGame}>
          <span>Starta spelet</span>
          <small>Koppla citaten till rätt parti</small>
        </button>
        <p className="intro-note">
          En lekfull prototyp. Historiska citat behöver inte motsvara partiernas politik i dag.
        </p>
        {soundButton}
      </main>
    );
  }

  if (screen === 'results') {
    const partyResults = parties.map((party) => {
      const partyAnswers = answers.filter((answer) => answer.party === party.id);
      return {
        party,
        total: partyAnswers.length,
        correct: partyAnswers.filter((answer) => answer.correct).length,
      };
    });
    const bestAccuracy = Math.max(
      0,
      ...partyResults
        .filter((result) => result.total)
        .map((result) => result.correct / result.total),
    );
    const bestParties = partyResults.filter(
      (result) => result.total && result.correct / result.total === bestAccuracy,
    );
    const resultTitle =
      score === answers.length
        ? 'Partiledardebattens orakel!'
        : score >= Math.ceil(answers.length * .75)
          ? 'Du läser mellan partilinjerna!'
          : score >= Math.ceil(answers.length * .375)
            ? 'Partierna lyckades lura dig.'
            : 'Fullständig politisk maskerad!';

    return (
      <main className="results-screen">
        <div className="results-rays" aria-hidden="true" />
        {score === answers.length && <Confetti />}
        <button className="sound-button results-sound" onClick={toggleSound} aria-label={soundOn ? 'Stäng av ljud' : 'Slå på ljud'}>
          <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span>
        </button>
        <section className="results-card" aria-labelledby="result-title">
          <p className="results-kicker">Slutresultat</p>
          <div className="score-burst" aria-label={`${score} rätt av ${answers.length}`}>
            <strong>{score}</strong>
            <span>av {answers.length}</span>
          </div>
          <h1 id="result-title">{resultTitle}</h1>
          <p className="results-copy">
            Det här mäter din magkänsla för vem som låter som vem — inte vad du själv tycker.
          </p>

          <div className="result-parties" aria-label="Resultat per parti">
            {partyResults.map(({ party, correct, total }) => {
              const perfect = total > 0 && correct === total;
              const partial = correct > 0 && !perfect;
              return (
                <div
                  key={party.id}
                  className={`result-party ${perfect ? 'got-it' : partial ? 'partly-it' : 'missed-it'}`}
                  style={{ '--party': party.color, '--party-ink': party.ink } as CSSProperties}
                  title={party.name}
                >
                  <img className={`party-logo logo-${party.id.toLowerCase()}`} src={party.logo} alt="" />
                  <span className="sr-only">{party.name}</span>
                  <b aria-label={`${correct} rätt av ${total}`}>
                    {total === 1 ? (correct ? '✓' : '×') : `${correct}/${total}`}
                  </b>
                </div>
              );
            })}
          </div>

          <p className="best-read">
            {bestAccuracy > 0
              ? `Bäst koll hade du på: ${bestParties.map(({ party }) => party.name).join(', ')}.`
              : 'Den här gången lyckades samtliga partier maskera sig.'}
          </p>

          <div className="result-actions">
            <button className="primary-action" onClick={startGame}>Spela igen</button>
            <button className="secondary-action" onClick={returnHome}>Till startscenen</button>
          </div>
          <p className="poc-note">
            I fullversionen blir rundan längre och resultatet visar vilka partier du faktiskt känner bäst.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className={[
      'game-screen',
      `phase-${phase}`,
      selected ? 'has-selection cable-live' : '',
      dragging ? 'cable-live is-dragging-cable' : '',
      phase === 'reveal' ? (wasCorrect ? 'answer-correct' : 'answer-wrong') : '',
    ].filter(Boolean).join(' ')}>
      <div className="stage-lights" aria-hidden="true" />
      {phase === 'reveal' && wasCorrect && <Confetti />}
      <p className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        {phase === 'reveal'
          ? `${wasCorrect ? 'Rätt svar.' : `Fel svar. Du valde ${selectedParty?.name}.`} Rätt parti är ${correctParty.name}. Citatet sades av ${current.speaker} år ${current.date.slice(0, 4)}.`
          : selectedParty
            ? `${selectedParty.name} är inkopplat. Lås in svaret när du är redo.`
            : ''}
      </p>

      <header className="game-header">
        <button className="mini-brand" onClick={returnHome}>
          Vem sa vad?
        </button>
        <div className="progress-pill">
          Fråga {currentIndex + 1} av {roundQuotes.length}
          <span className="score-inline">{score} rätt</span>
        </div>
        {soundButton}
      </header>

      <section className="game-content" aria-labelledby="instruction">
        <p className="eyebrow" id="instruction">
          {phase === 'choosing' ? 'Koppla citatet till ett parti' : 'Ridån går upp'}
        </p>

        <article className="quote-card">
          {phase === 'reveal' && (
            <div className={`reveal-ribbon ${wasCorrect ? 'is-right' : 'is-wrong'}`} aria-hidden="true">
              {wasCorrect ? 'Rätt svar!' : 'Inte riktigt!'}
            </div>
          )}
          <span className="quote-mark opening" aria-hidden="true">“</span>
          <blockquote>{current.quote}</blockquote>
          <span className="quote-mark closing" aria-hidden="true">”</span>
          <span
            ref={jackRef}
            className={`cable-jack ${dragging ? 'is-dragging' : ''} ${selected ? 'is-connected' : ''}`}
            aria-hidden="true"
            onPointerDown={startCable}
            onPointerMove={moveCable}
            onPointerUp={dropCable}
            onPointerCancel={cancelCable}
          >
            <span />
          </span>
        </article>

        <div className="party-grid" aria-label="Välj parti">
          {parties.map((party) => {
            const isSelected = selected === party.id;
            const isCorrect = phase === 'reveal' && current.party === party.id;
            const isWrong = phase === 'reveal' && isSelected && !isCorrect;
            const isMuted = phase === 'reveal' && !isCorrect && !isSelected;
            const showLeaders = isSelected || isCorrect;
            return (
              <button
                key={party.id}
                data-party={party.id}
                className={[
                  'party-podium',
                  isSelected ? 'is-selected' : '',
                  isCorrect ? 'is-correct' : '',
                  isWrong ? 'is-wrong' : '',
                  isMuted ? 'is-muted' : '',
                ].filter(Boolean).join(' ')}
                style={{ '--party': party.color, '--party-ink': party.ink } as CSSProperties}
                onClick={() => connectParty(party.id)}
                disabled={phase === 'reveal'}
                aria-pressed={isSelected}
                aria-label={`${party.name}${isSelected ? ', inkopplat' : ''}${isCorrect ? ', rätt svar' : ''}`}
              >
                {showLeaders && (
                  <>
                    {isCorrect && <span className="correct-spotlight" aria-hidden="true" />}
                    <PartyLeaders party={party} />
                  </>
                )}
                <span className="party-token">
                  <img className={`party-logo logo-${party.id.toLowerCase()}`} src={party.logo} alt="" />
                </span>
                <span className="party-name">{party.name}</span>
              </button>
            );
          })}
        </div>

        {phase === 'choosing' ? (
          <div className={`selection-console ${selectedParty ? 'is-armed' : ''}`}>
            {selectedParty ? (
              <>
                <p>
                  <span className="power-dot" aria-hidden="true" />
                  Kabeln leder till <strong>{selectedParty.name}</strong>
                </p>
                <button className="lock-answer" onClick={submitAnswer}>
                  Lås in svaret
                  <span aria-hidden="true"> ⚡</span>
                </button>
                <small>Dra om kabeln eller välj ett annat podium för att byta.</small>
              </>
            ) : (
              <p className="game-hint">
                Dra i den gula kontakten — eller tryck direkt på ett podium.
              </p>
            )}
          </div>
        ) : (
          <aside className={`reveal-panel ${wasCorrect ? 'panel-correct' : 'panel-wrong'}`}>
            <div className="reveal-verdict">
              <span>{wasCorrect ? 'Du satte den!' : `Du valde ${selectedParty?.name}`}</span>
              <strong>Rätt parti: {correctParty.name}</strong>
            </div>
            <div className="source-story">
              <p className="speaker-line">
                <strong>{current.speaker}</strong>
                <span>{current.speakerRole}</span>
              </p>
              <time dateTime={current.date}>{formatDate(current.date)}</time>
              <p>{current.context}</p>
              <p className="historical-note">
                Detta sades {current.date.slice(0, 4)} och behöver inte motsvara partiets politik i dag.
              </p>
              {current.editorialNote && (
                <details>
                  <summary>Redaktionell precisering</summary>
                  <p>{current.editorialNote}</p>
                </details>
              )}
              <a href={current.source.url} target="_blank" rel="noreferrer">
                Se originalkällan hos {current.source.publisher}
                <span aria-hidden="true"> ↗</span>
              </a>
              <small>{current.source.title}</small>
            </div>
            <button ref={nextButtonRef} className="next-button" onClick={nextQuestion}>
              {currentIndex === roundQuotes.length - 1 ? 'Visa resultatet' : 'Nästa citat'}
              <span aria-hidden="true"> →</span>
            </button>
          </aside>
        )}
      </section>

      <svg className={`cable-layer ${dragging || selected ? 'is-live' : ''}`} aria-hidden="true">
        {cable && (
          <>
            <path className="cable-shadow" d={cable.path} />
            <path className="cable-core" d={cable.path} />
            <path className="cable-current cable-current-gold" d={cable.path} pathLength="100" />
            <path className="cable-current cable-current-blue" d={cable.path} pathLength="100" />
            {(dragging || selected) && (
              <>
                <circle className="electric-ring" cx={cable.end.x} cy={cable.end.y} r="22" />
                <circle className="cable-plug" cx={cable.end.x} cy={cable.end.y} r="13" />
                <g className="spark-burst" transform={`translate(${cable.end.x} ${cable.end.y})`}>
                  <line x1="-18" y1="-4" x2="-30" y2="-9" />
                  <line x1="15" y1="-13" x2="24" y2="-23" />
                  <line x1="18" y1="7" x2="31" y2="12" />
                  <line x1="-8" y1="18" x2="-13" y2="30" />
                </g>
              </>
            )}
          </>
        )}
      </svg>
    </main>
  );
}

function PartyLeaders({ party }: { party: Party }) {
  return (
    <span className={`leader-pop ${party.leaders.length > 1 ? 'is-duo' : ''}`} aria-hidden="true">
      {party.leaders.map((leader) => (
        <span className="leader-portrait" key={leader.name}>
          <img src={leader.image} alt="" />
        </span>
      ))}
    </span>
  );
}

function Confetti() {
  return (
    <div className="confetti-field" aria-hidden="true">
      {confetti.map((piece, index) => (
        <i
          key={index}
          style={{
            '--left': `${piece.left}%`,
            '--drift': `${piece.drift}px`,
            '--delay': `${piece.delay}s`,
            '--duration': `${piece.duration}s`,
            '--rotation': `${piece.rotation}deg`,
            '--confetti': piece.color,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
