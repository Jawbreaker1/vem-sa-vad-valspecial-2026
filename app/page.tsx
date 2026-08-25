'use client';

/* eslint-disable @next/next/no-img-element */

import {
  CSSProperties,
  PointerEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PartyId,
  Quote,
  QuoteThemeId,
  quotePriority,
  quotes,
  verifiedSpeakerCaricatures,
} from './quotes';
import {
  quotePresentations,
  quoteVisualGlyphs,
  type QuotePresentation,
} from './quote-presentations';

type Party = {
  id: PartyId;
  name: string;
  shortName: string;
  logo: string;
  leaders: Array<{
    name: string;
    image: string;
  }>;
  victoryImage: string;
  color: string;
  ink: string;
};

type Answer = {
  questionIndex: number;
  quoteId: string;
  party: PartyId;
  chosen: PartyId | null;
  correct: boolean;
  resolution: 'manual' | 'auto-lock' | 'timeout';
  secondsLeft: number;
  streakBefore: number;
  points: {
    base: number;
    time: number;
    streak: number;
    total: number;
  };
};

type Point = { x: number; y: number };
type Screen = 'intro' | 'question' | 'results';
type Phase = 'category' | 'choosing' | 'locking' | 'reveal' | 'transition';
type ResultStage = 'countdown' | 'opening' | 'counting' | 'final';
type ShareStatus = 'idle' | 'shared' | 'copied' | 'manual';
type LeaderGalleryState = 'roam' | 'suspense' | 'cheer' | 'boo' | 'laugh';
type Cue =
  | 'start'
  | 'question'
  | 'hover'
  | 'grab'
  | 'connect'
  | 'countdown'
  | 'lock'
  | 'transition'
  | 'timeout'
  | 'correct'
  | 'combo'
  | 'wrong'
  | 'share';
type CrowdCue = 'cheer' | 'boo' | 'laugh';
type MusicCue = 'intro' | 'game';
type CableHum = {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
};

type QuestionTheme = {
  id: QuoteThemeId;
  label: string;
  description: string;
  mark: string;
};

const parties: Party[] = [
  {
    id: 'S',
    name: 'Socialdemokraterna',
    shortName: 'S',
    logo: '/party-logos/s.svg',
    leaders: [{ name: 'Magdalena Andersson', image: '/leaders/magdalena-andersson.webp' }],
    victoryImage: '/victory/s.webp',
    color: '#e52532',
    ink: '#fff',
  },
  {
    id: 'M',
    name: 'Moderaterna',
    shortName: 'M',
    logo: '/party-logos/m.webp',
    leaders: [{ name: 'Ulf Kristersson', image: '/leaders/ulf-kristersson.webp' }],
    victoryImage: '/victory/m.webp',
    color: '#1598d3',
    ink: '#fff',
  },
  {
    id: 'SD',
    name: 'Sverigedemokraterna',
    shortName: 'SD',
    logo: '/party-logos/sd.png',
    leaders: [{ name: 'Jimmie Åkesson', image: '/leaders/jimmie-akesson.webp' }],
    victoryImage: '/victory/sd.webp',
    color: '#f5ca26',
    ink: '#102a56',
  },
  {
    id: 'V',
    name: 'Vänsterpartiet',
    shortName: 'V',
    logo: '/party-logos/v.svg',
    leaders: [{ name: 'Nooshi Dadgostar', image: '/leaders/nooshi-dadgostar.webp' }],
    victoryImage: '/victory/v.webp',
    color: '#d71933',
    ink: '#fff',
  },
  {
    id: 'C',
    name: 'Centerpartiet',
    shortName: 'C',
    logo: '/party-logos/c.png',
    leaders: [{ name: 'Elisabeth Thand Ringqvist', image: '/leaders/elisabeth-thand-ringqvist.webp' }],
    victoryImage: '/victory/c.webp',
    color: '#079447',
    ink: '#fff',
  },
  {
    id: 'KD',
    name: 'Kristdemokraterna',
    shortName: 'KD',
    logo: '/party-logos/kd.svg',
    leaders: [{ name: 'Ebba Busch', image: '/leaders/ebba-busch.webp' }],
    victoryImage: '/victory/kd.webp',
    color: '#203c8d',
    ink: '#fff',
  },
  {
    id: 'L',
    name: 'Liberalerna',
    shortName: 'L',
    logo: '/party-logos/l.svg',
    leaders: [{ name: 'Simona Mohamsson', image: '/leaders/simona-mohamsson.webp' }],
    victoryImage: '/victory/l.webp',
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
    victoryImage: '/victory/mp.webp',
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

const introConfetti = Array.from({ length: 42 }, (_, index) => ({
  left: (index * 43 + 7) % 101,
  sway: ((index * 67) % 190) - 95,
  delay: -((index * 83) % 150) / 10,
  duration: 7.4 + (index % 7) * .82,
  rotation: 540 + (index % 9) * 105,
  size: 6 + (index % 4) * 2,
  color: ['#ffd136', '#ff2449', '#159cff', '#7cdbff', '#ffffff'][index % 5],
  shape: index % 5 === 0 ? 'dot' : index % 3 === 0 ? 'ribbon' : 'ticket',
}));

const QUESTION_SECONDS = 20;
const QUESTION_CATEGORY_MS = 900;
const QUESTIONS_PER_PARTY = 3;
const BASE_POINTS = 1000;
const POINTS_PER_SECOND = 25;
const STREAK_STEP_POINTS = 125;
const MAX_STREAK_BONUS_STEPS = 4;
const MUSIC_VOLUMES: Record<MusicCue, number> = { intro: .15, game: .12 };
const OPENING_QUOTE_GROUPS = [
  [
    'mp-bolund-2022-fingret-at-putin',
    'v-dadgostar-2025-mp3-celine-dion',
    'sd-akesson-2021-pippi',
    'kd-hagglund-2009-overraskningskaniner',
    's-lofven-2020-pannkaka',
    'm-kinberg-batra-2017-valjarna',
  ],
  [
    'm-reinfeldt-2014-oppna-hjartan',
    's-persson-1995-skuld',
  ],
  [
    'c-loof-2013-ikea-loning',
    'c-thand-ringqvist-2026-trad-tonaringar',
    'v-dadgostar-2025-tapetsera-skane',
    'kd-hagglund-2004-snigel-racerbil',
  ],
  [
    'mp-fridolin-2019-pizza-akesson',
    'kd-busch-2025-vard-efter-behov',
    'sd-akesson-2018-svenska-folkhemmet',
    'l-bjorklund-2017-socialt-ansvar',
    'm-reinfeldt-2011-arbetarparti',
  ],
  [
    'c-demirok-2024-arbetslos',
    'kd-busch-2025-dikt-logn',
    'sd-akesson-2012-tokyo',
    'sd-akesson-2017-battre-parti',
    'v-sjostedt-2018-horselkapor',
    'm-reinfeldt-2014-ofarliga',
  ],
] as const;
const leaderGallerySlots = [
  [{ id: 'magdalena-andersson', name: 'Magdalena Andersson' }],
  [{ id: 'ulf-kristersson', name: 'Ulf Kristersson' }],
  [{ id: 'jimmie-akesson', name: 'Jimmie Åkesson' }],
  [{ id: 'nooshi-dadgostar', name: 'Nooshi Dadgostar' }],
  [{ id: 'elisabeth-thand-ringqvist', name: 'Elisabeth Thand Ringqvist' }],
  [{ id: 'ebba-busch', name: 'Ebba Busch' }],
  [{ id: 'simona-mohamsson', name: 'Simona Mohamsson' }],
  [
    { id: 'amanda-lind', name: 'Amanda Lind' },
    { id: 'daniel-hellden', name: 'Daniel Helldén' },
  ],
] as const;
const questionThemes: Record<QuoteThemeId, QuestionTheme> = {
  classic: {
    id: 'classic',
    label: 'Klassikern',
    description: 'Citatet som fastnade',
    mark: '★',
  },
  grodcircus: {
    id: 'grodcircus',
    label: 'Grodcirkusen',
    description: 'Politik när den blir märklig',
    mark: '?!',
  },
  'aged-poorly': {
    id: 'aged-poorly',
    label: 'Det där åldrades… sådär',
    description: 'Originalet möter vad som hände sedan',
    mark: '↺',
  },
  disguise: {
    id: 'disguise',
    label: 'Partimaskeraden',
    description: 'När orden låter som fel parti',
    mark: '?',
  },
  duel: {
    id: 'duel',
    label: 'Duellen',
    description: 'Repliken som träffade tillbaka',
    mark: 'VS',
  },
  'word-picture': {
    id: 'word-picture',
    label: 'Ordbilden',
    description: 'Politik målad med stora penslar',
    mark: '“”',
  },
};

function shuffle<T>(items: readonly T[]) {
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

function weightedSample(items: Quote[], count: number, required: Quote[] = []) {
  const requiredIds = new Set(required.map((quote) => quote.id));
  const pool = items.filter((quote) => !requiredIds.has(quote.id));
  const selected: Quote[] = [...required].slice(0, count);

  while (pool.length && selected.length < count) {
    const usedThemes = new Set(selected.map((quote) => quote.theme));
    const weights = pool.map((quote) => {
      const qualityWeight = Math.max(1, quotePriority(quote) - 50) ** 2;
      const themeWeight = usedThemes.has(quote.theme) ? .24 : 1.15;
      return qualityWeight * themeWeight;
    });
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let draw = Math.random() * totalWeight;
    let chosenIndex = pool.length - 1;

    for (let index = 0; index < weights.length; index += 1) {
      draw -= weights[index];
      if (draw <= 0) {
        chosenIndex = index;
        break;
      }
    }

    selected.push(pool.splice(chosenIndex, 1)[0]);
  }

  return selected;
}

function buildOpeningSequence(approved: Quote[]) {
  const approvedById = new Map(approved.map((quote) => [quote.id, quote]));
  const usedParties = new Set<PartyId>();
  const selected: Quote[] = [];

  for (const group of OPENING_QUOTE_GROUPS) {
    const candidates = shuffle(group)
      .map((id) => approvedById.get(id))
      .filter((quote): quote is Quote => Boolean(quote));
    const chosen = candidates.find((quote) => !usedParties.has(quote.party)) ?? candidates[0];
    if (!chosen) continue;
    selected.push(chosen);
    usedParties.add(chosen.party);
  }

  return selected;
}

function uniqueQuotes(items: Quote[]) {
  return [...new Map(items.map((quote) => [quote.id, quote])).values()];
}

function orderByTheme(items: Quote[], preceding?: Quote) {
  const pool = shuffle(items);
  const ordered: Quote[] = [];

  while (pool.length) {
    const last = ordered.at(-1) ?? preceding;
    let candidates = pool.filter((quote) => quote.theme !== last?.theme);
    if (!candidates.length) candidates = [...pool];

    if (!ordered.length && !preceding) {
      const showOpeners = candidates.filter(
        (quote) => quote.theme === 'classic' || quote.theme === 'grodcircus',
      );
      if (showOpeners.length) candidates = showOpeners;
    }

    const counts = new Map<QuoteThemeId, number>();
    for (const quote of pool) counts.set(quote.theme, (counts.get(quote.theme) ?? 0) + 1);
    const highestRemaining = Math.max(...candidates.map((quote) => counts.get(quote.theme) ?? 0));
    candidates = candidates.filter((quote) => counts.get(quote.theme) === highestRemaining);

    const differentParty = candidates.filter((quote) => quote.party !== last?.party);
    if (differentParty.length) candidates = differentParty;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    ordered.push(chosen);
    pool.splice(pool.findIndex((quote) => quote.id === chosen.id), 1);
  }

  return ordered;
}

function buildRound(bank: Quote[]) {
  const approved = bank.filter((quote) => quote.reviewStatus === 'approved');
  const openingQuotes = buildOpeningSequence(approved);
  const themeCounts = new Map<QuoteThemeId, number>();
  for (const quote of approved) {
    themeCounts.set(quote.theme, (themeCounts.get(quote.theme) ?? 0) + 1);
  }

  let bestSelection: Quote[] = [];
  let bestThemeCoverage = 0;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const selection = parties.flatMap((party) => {
      const candidates = approved.filter((quote) => quote.party === party.id);
      if (candidates.length < QUESTIONS_PER_PARTY) {
        throw new Error(`${party.name} saknar tillräckligt många godkända citat.`);
      }
      const uniqueThemeQuotes = candidates.filter((quote) => themeCounts.get(quote.theme) === 1);
      const partyOpeners = openingQuotes.filter((quote) => quote.party === party.id);
      return weightedSample(
        candidates,
        QUESTIONS_PER_PARTY,
        uniqueQuotes([...partyOpeners, ...uniqueThemeQuotes]),
      );
    });
    const coverage = new Set(selection.map((quote) => quote.theme)).size;
    if (coverage > bestThemeCoverage) {
      bestSelection = selection;
      bestThemeCoverage = coverage;
    }
    if (coverage === themeCounts.size) break;
  }

  const selectedIds = new Set(bestSelection.map((quote) => quote.id));
  const selectedOpeners = openingQuotes.filter((quote) => selectedIds.has(quote.id));
  const openingIds = new Set(selectedOpeners.map((quote) => quote.id));
  const orderedTail = orderByTheme(
    bestSelection.filter((quote) => !openingIds.has(quote.id)),
    selectedOpeners.at(-1),
  );
  return [...selectedOpeners, ...orderedTail];
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

type QuoteSegment = {
  kind: 'plain' | 'impact' | 'soft';
  text: string;
};

function segmentQuote(text: string, presentation: QuotePresentation | undefined) {
  if (!presentation) return [{ kind: 'plain', text }] satisfies QuoteSegment[];

  const ranges = [
    presentation.impact && { kind: 'impact' as const, phrase: presentation.impact },
    presentation.soft && { kind: 'soft' as const, phrase: presentation.soft },
  ]
    .filter((item): item is { kind: 'impact' | 'soft'; phrase: string } => Boolean(item))
    .map((item) => ({ ...item, start: text.indexOf(item.phrase) }))
    .filter((item) => item.start >= 0)
    .sort((a, b) => a.start - b.start)
    .filter((item, index, items) => {
      if (index === 0) return true;
      const previous = items[index - 1];
      return item.start >= previous.start + previous.phrase.length;
    });

  if (!ranges.length) return [{ kind: 'plain', text }] satisfies QuoteSegment[];

  const segments: QuoteSegment[] = [];
  let cursor = 0;
  ranges.forEach((range) => {
    if (range.start > cursor) {
      segments.push({ kind: 'plain', text: text.slice(cursor, range.start) });
    }
    segments.push({ kind: range.kind, text: range.phrase });
    cursor = range.start + range.phrase.length;
  });
  if (cursor < text.length) segments.push({ kind: 'plain', text: text.slice(cursor) });
  return segments;
}

function trailingCorrectStreak(answers: Answer[]) {
  let streak = 0;
  for (let index = answers.length - 1; index >= 0; index -= 1) {
    if (!answers[index].correct) break;
    streak += 1;
  }
  return streak;
}

function calculatePoints(correct: boolean, secondsLeft: number, streakBefore: number) {
  if (!correct) return { base: 0, time: 0, streak: 0, total: 0 };
  const safeSeconds = Math.max(0, Math.min(QUESTION_SECONDS, Math.round(secondsLeft)));
  const base = BASE_POINTS;
  const time = safeSeconds * POINTS_PER_SECOND;
  const streak = Math.min(Math.max(0, streakBefore), MAX_STREAK_BONUS_STEPS)
    * STREAK_STEP_POINTS;
  return { base, time, streak, total: base + time + streak };
}

function formatPoints(points: number) {
  return Math.max(0, Math.round(points)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function isAbortError(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && error.name === 'AbortError';
}

function scoreBreakdown(answer: Answer) {
  if (!answer.correct) return '0 poäng';
  const parts = [
    `${formatPoints(answer.points.base)} grund`,
    `+${formatPoints(answer.points.time)} tid`,
  ];
  if (answer.points.streak) parts.push(`+${formatPoints(answer.points.streak)} svit`);
  return parts.join(' · ');
}

function milestoneForQuestion(questionNumber: number) {
  if (questionNumber === 6) return 'Första akten klar!';
  if (questionNumber === 12) return 'Halvvägs!';
  if (questionNumber === 18) return 'Slutspurt!';
  if (questionNumber === 24) return 'Finalen avgjord!';
  return null;
}

function feedbackCopy(answer: Answer, streak: number) {
  let headline = 'BZZZT!';
  let detail = 'Rätt podium lyser upp';

  if (answer.resolution === 'timeout') {
    headline = 'FÖR SENT!';
    detail = 'Publiken hann före kabeln';
  } else if (answer.correct) {
    headline = streak >= 4
      ? `MEGASVIT ×${streak}!`
      : streak === 3
        ? 'TRIPPEL!'
        : streak === 2
          ? 'DUBBEL!'
          : answer.secondsLeft >= 15
            ? 'BLIXTSNABBT!'
            : answer.secondsLeft <= 1
              ? 'PÅ HÅRET!'
              : 'RÄTT!';
    detail = `+${formatPoints(answer.points.total)} poäng · ${answer.secondsLeft} sek kvar`;
  } else if (answer.streakBefore >= 2) {
    headline = 'SVITEN BRÖTS!';
    detail = `Du hann bygga en svit på ${answer.streakBefore}`;
  } else if (answer.resolution === 'auto-lock') {
    headline = 'LÅST PÅ NOLL!';
    detail = 'Rätt podium tar strålkastaren';
  }

  return { headline, detail };
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
  const [previewing, setPreviewing] = useState<PartyId | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [musicReady, setMusicReady] = useState(false);
  const [musicAttempted, setMusicAttempted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [timedOut, setTimedOut] = useState(false);
  const [autoLocked, setAutoLocked] = useState(false);
  const [resultStage, setResultStage] = useState<ResultStage>('countdown');
  const [resultCountdown, setResultCountdown] = useState(3);
  const [displayedPoints, setDisplayedPoints] = useState(0);
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle');
  const [manualShareText, setManualShareText] = useState('');
  const [sharePending, setSharePending] = useState(false);
  const [geometry, setGeometry] = useState<{
    start: Point;
    targets: Partial<Record<PartyId, Point>>;
  } | null>(null);
  const jackRef = useRef<HTMLSpanElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const sfxMasterRef = useRef<GainNode | null>(null);
  const feedbackGainRef = useRef<GainNode | null>(null);
  const crowdAudioRef = useRef<Partial<Record<CrowdCue, HTMLAudioElement>>>({});
  const activeCrowdRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<Partial<Record<MusicCue, HTMLAudioElement>>>({});
  const musicReadyRef = useRef(false);
  const musicAttemptedRef = useRef(false);
  const musicRequestRef = useRef(0);
  const desiredMusicRef = useRef<MusicCue>('intro');
  const soundOnRef = useRef(true);
  const screenRef = useRef<Screen>('intro');
  const switchMusicActionRef = useRef<(
    cue: MusicCue,
    force?: boolean,
    restart?: boolean,
  ) => void>(() => undefined);
  const unlockMusicActionRef = useRef<(cue: MusicCue) => void>(() => undefined);
  const cableHumRef = useRef<CableHum | null>(null);
  const selectedRef = useRef<PartyId | null>(null);
  const resolvedRef = useRef(false);
  const timeoutActionRef = useRef<() => void>(() => undefined);
  const tickActionRef = useRef<(secondsRemaining: number) => void>(() => undefined);
  const resultRevealActionRef = useRef<() => void>(() => undefined);
  const resultCueActionRef = useRef<(cue: Cue, force?: boolean, value?: number) => void>(() => undefined);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const lockAnswerRef = useRef<HTMLButtonElement>(null);
  const revealPanelRef = useRef<HTMLElement>(null);
  const instructionRef = useRef<HTMLParagraphElement>(null);
  const revealTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const hoverCueRef = useRef<{ party: PartyId | null; at: number }>({ party: null, at: 0 });
  const hoveredPartyRef = useRef<PartyId | null>(null);
  const focusedPartyRef = useRef<PartyId | null>(null);
  const dragTargetRef = useRef<PartyId | null>(null);
  const resultTimersRef = useRef<number[]>([]);
  const resultFrameRef = useRef<number | null>(null);
  const resultTitleRef = useRef<HTMLHeadingElement>(null);
  const manualShareRef = useRef<HTMLTextAreaElement>(null);
  const sharePendingRef = useRef(false);
  const resultRevealFinishedRef = useRef(false);

  const current = roundQuotes[currentIndex] ?? quotes[0];
  const currentTheme = questionThemes[current.theme];
  const correctParty = partyById(current.party);
  const selectedParty = selected ? partyById(selected) : null;
  const showingAnswer = phase === 'reveal' || phase === 'transition';
  const wasCorrect = !timedOut && selected === current.party;
  const lastAnswer = answers.at(-1);
  const visibleAnswers = phase === 'locking' && lastAnswer?.quoteId === current.id
    ? answers.slice(0, -1)
    : answers;
  const score = visibleAnswers.filter((answer) => answer.correct).length;
  const timeoutCount = visibleAnswers.filter((answer) => answer.resolution === 'timeout').length;
  const wrongCount = visibleAnswers.length - score - timeoutCount;
  const totalPoints = visibleAnswers.reduce((total, answer) => total + answer.points.total, 0);
  const streak = trailingCorrectStreak(visibleAnswers);
  const bestStreak = Math.max(
    0,
    ...answers.map((answer) => (answer.correct ? answer.streakBefore + 1 : answer.streakBefore)),
  );
  const currentMilestone = showingAnswer
    ? milestoneForQuestion(currentIndex + 1)
    : null;
  const currentFeedback = showingAnswer && lastAnswer?.quoteId === current.id
    ? feedbackCopy(lastAnswer, streak)
    : null;
  const currentPointGain = phase === 'reveal' && lastAnswer?.quoteId === current.id
    ? lastAnswer.points.total
    : null;
  const timerRatio = Math.max(0, Math.min(1, timeLeft / QUESTION_SECONDS));
  const timerPressure = 1 - timerRatio;
  const timerScale = 1 + Math.pow(timerPressure, 2.2) * .95;
  const timerShellScale = 1 + Math.pow(timerPressure, 3) * .18;
  const needsMusicUnlock = soundOn && !musicReady && !musicAttempted;
  const leaderGalleryState: LeaderGalleryState = showingAnswer
    ? timedOut && selected === null
      ? 'laugh'
      : wasCorrect
        ? 'cheer'
        : 'boo'
    : phase === 'locking' || previewing !== null || dragging || selected !== null
      ? 'suspense'
      : 'roam';

  useLayoutEffect(() => {
    const shouldResetScroll = screen !== 'question' || phase === 'category' || phase === 'choosing';
    if (!shouldResetScroll) return;

    const resetScroll = () => {
      const gameScreen = document.querySelector<HTMLElement>('.game-screen');
      if (gameScreen) {
        gameScreen.scrollTop = 0;
        gameScreen.scrollLeft = 0;
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body) {
      activeElement.blur();
    }

    if (
      screen === 'question'
      && phase === 'choosing'
      && !window.matchMedia('(pointer: coarse)').matches
    ) {
      instructionRef.current?.focus({ preventScroll: true });
    }

    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    const settleTimer = window.setTimeout(resetScroll, 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, [screen, currentIndex, phase]);

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
    const timer = window.setTimeout(() => {
      const panel = revealPanelRef.current;
      if (!panel) return;

      const gameScreen = panel.closest<HTMLElement>('.game-screen');
      if (gameScreen) {
        gameScreen.scrollTop = 0;
        gameScreen.scrollLeft = 0;
      }

      const isDesktopOverlay = window.matchMedia('(min-width: 901px)').matches;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (isDesktopOverlay) {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: reduceMotion ? 'auto' : 'smooth',
        });
        panel.focus({ preventScroll: true });
        return;
      }

      const isMobile = window.matchMedia('(max-width: 600px)').matches;
      const rect = panel.getBoundingClientRect();
      const stickyHeaderHeight = isMobile
        ? (document.querySelector<HTMLElement>('.game-header')?.getBoundingClientRect().height ?? 0)
        : 0;
      const topInset = stickyHeaderHeight + 12;
      const fullyVisible = rect.top >= topInset && rect.bottom <= window.innerHeight - 12;

      if (!fullyVisible) {
        panel.scrollIntoView({
          block: isMobile ? 'start' : 'nearest',
          behavior: reduceMotion ? 'auto' : 'smooth',
        });
      }
      panel.focus({ preventScroll: true });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (screen !== 'question' || phase !== 'choosing' || !selected) return;
    const frame = window.requestAnimationFrame(() => {
      lockAnswerRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screen, phase, selected]);

  useEffect(() => {
    screenRef.current = screen;
    soundOnRef.current = soundOn;
    switchMusicActionRef.current = switchMusic;
    unlockMusicActionRef.current = (cue) => {
      primeCrowdAudio();
      setSynthSound(true);
      switchMusic(cue, true, true);
    };
  });

  useEffect(() => {
    if (screen !== 'question') return;
    const image = new Image();
    image.decoding = 'async';
    image.src = correctParty.victoryImage;
    return () => {
      image.src = '';
    };
  }, [screen, correctParty.victoryImage]);

  useEffect(() => {
    if (screen !== 'question') return;
    const revealPreloads = roundQuotes
      .slice(currentIndex, currentIndex + 2)
      .map((quote) => quote.speakerCaricature ?? quote.speakerImage)
      .filter((source): source is string => Boolean(source))
      .filter((source, index, sources) => sources.indexOf(source) === index)
      .map((source) => {
        const image = new Image();
        image.decoding = 'async';
        image.src = source;
        return image;
      });

    return () => {
      revealPreloads.forEach((image) => {
        image.src = '';
      });
    };
  }, [screen, currentIndex, roundQuotes]);

  useEffect(() => {
    const cheer = new Audio('/sounds/crowd-cheer.mp3');
    const boo = new Audio('/sounds/crowd-boo.mp3');
    const laugh = new Audio('/sounds/crowd-laugh.mp3');
    const introMusic = new Audio('/music/intro-show.mp3');
    const gameMusic = new Audio('/music/question-tension.mp3');
    cheer.preload = 'none';
    boo.preload = 'none';
    laugh.preload = 'none';
    cheer.volume = .88;
    boo.volume = .92;
    laugh.volume = .92;
    introMusic.preload = 'metadata';
    gameMusic.preload = 'none';
    introMusic.loop = true;
    gameMusic.loop = true;
    introMusic.volume = MUSIC_VOLUMES.intro;
    gameMusic.volume = MUSIC_VOLUMES.game;

    const recoverMusic = (cue: MusicCue, track: HTMLAudioElement) => {
      if (desiredMusicRef.current !== cue || !soundOnRef.current) return;
      musicReadyRef.current = false;
      musicAttemptedRef.current = false;
      setMusicReady(false);
      setMusicAttempted(false);
      window.setTimeout(() => {
        if (
          document.visibilityState === 'visible'
          && soundOnRef.current
          && desiredMusicRef.current === cue
          && track.paused
          && !activeCrowdRef.current
        ) {
          switchMusicActionRef.current(cue);
        }
      }, 180);
    };
    const recoverIntro = () => recoverMusic('intro', introMusic);
    const recoverGame = () => recoverMusic('game', gameMusic);
    introMusic.addEventListener('pause', recoverIntro);
    introMusic.addEventListener('ended', recoverIntro);
    gameMusic.addEventListener('pause', recoverGame);
    gameMusic.addEventListener('ended', recoverGame);
    crowdAudioRef.current = { cheer, boo, laugh };
    musicAudioRef.current = { intro: introMusic, game: gameMusic };
    musicReadyRef.current = false;
    musicAttemptedRef.current = false;
    switchMusicActionRef.current(screenRef.current === 'question' ? 'game' : 'intro');

    return () => {
      introMusic.removeEventListener('pause', recoverIntro);
      introMusic.removeEventListener('ended', recoverIntro);
      gameMusic.removeEventListener('pause', recoverGame);
      gameMusic.removeEventListener('ended', recoverGame);
      [cheer, boo, laugh, introMusic, gameMusic].forEach((track) => {
        track.pause();
        track.currentTime = 0;
      });
      cableHumRef.current?.sources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // The source may already have stopped after a completed drag.
        }
      });
      cableHumRef.current = null;
      crowdAudioRef.current = {};
      activeCrowdRef.current = null;
      musicAudioRef.current = {};
      musicReadyRef.current = false;
      musicAttemptedRef.current = false;
      musicRequestRef.current += 1;
      if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
      resultTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      resultTimersRef.current = [];
      if (resultFrameRef.current !== null) {
        window.cancelAnimationFrame(resultFrameRef.current);
        resultFrameRef.current = null;
      }
      const context = audioRef.current;
      audioRef.current = null;
      sfxMasterRef.current = null;
      feedbackGainRef.current = null;
      if (context && context.state !== 'closed') void context.close();
    };
  }, []);

  useEffect(() => {
    if (!soundOn || musicReady || musicAttempted) return;

    const unlockMusic = () => {
      document.removeEventListener('pointerdown', unlockMusic, true);
      document.removeEventListener('keydown', unlockMusic, true);
      unlockMusicActionRef.current(screen === 'question' ? 'game' : 'intro');
    };

    document.addEventListener('pointerdown', unlockMusic, true);
    document.addEventListener('keydown', unlockMusic, true);
    return () => {
      document.removeEventListener('pointerdown', unlockMusic, true);
      document.removeEventListener('keydown', unlockMusic, true);
    };
  }, [screen, soundOn, musicReady, musicAttempted]);

  useEffect(() => {
    if (!soundOn) return;
    const resumeMusic = () => {
      if (document.visibilityState === 'visible') {
        switchMusicActionRef.current(desiredMusicRef.current);
      }
    };
    document.addEventListener('visibilitychange', resumeMusic);
    return () => document.removeEventListener('visibilitychange', resumeMusic);
  }, [screen, soundOn]);

  useEffect(() => {
    timeoutActionRef.current = handleQuestionExpired;
    tickActionRef.current = (secondsRemaining) => playCue('countdown', false, secondsRemaining);
    resultRevealActionRef.current = completeResultReveal;
    resultCueActionRef.current = playCue;
  });

  useEffect(() => {
    if (screen !== 'question' || phase !== 'category') return;
    const timer = window.setTimeout(() => {
      setPhase('choosing');
      resultCueActionRef.current('question');
    }, QUESTION_CATEGORY_MS);
    return () => window.clearTimeout(timer);
  }, [screen, phase, current.id]);

  useEffect(() => {
    if (screen !== 'question' || phase !== 'choosing') return;
    let deadline = performance.now() + QUESTION_SECONDS * 1000;
    let hiddenAt = document.visibilityState === 'hidden' ? performance.now() : null;
    let lastSecond = QUESTION_SECONDS;
    const handleVisibility = () => {
      const now = performance.now();
      if (document.visibilityState === 'hidden') {
        hiddenAt ??= now;
        return;
      }
      if (hiddenAt !== null) {
        deadline += now - hiddenAt;
        hiddenAt = null;
      }
    };
    const timer = window.setInterval(() => {
      if (hiddenAt !== null) return;
      if (resolvedRef.current) {
        window.clearInterval(timer);
        return;
      }
      const next = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
      if (next === lastSecond) return;
      lastSecond = next;
      setTimeLeft(next);
      if (next > 0 && next <= 5) tickActionRef.current(next);
      if (next === 0) {
        window.clearInterval(timer);
        timeoutActionRef.current();
      }
    }, 100);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [screen, phase, currentIndex]);

  useEffect(() => {
    if (screen !== 'results') return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return clearResultRevealTimers;
    }

    const schedule = (delay: number, action: () => void) => {
      resultTimersRef.current.push(window.setTimeout(action, delay));
    };
    const countdownHit = (number: number) => {
      setResultCountdown(number);
      resultCueActionRef.current('countdown', false, number);
    };

    schedule(60, () => countdownHit(3));
    schedule(380, () => countdownHit(2));
    schedule(700, () => countdownHit(1));
    schedule(1020, () => {
      setResultStage('opening');
      resultCueActionRef.current('lock');
    });
    schedule(1390, () => {
      setResultStage('counting');
      resultCueActionRef.current('combo');
      const startedAt = performance.now();
      const duration = 860;
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayedPoints(Math.round(totalPoints * eased));
        if (progress < 1) {
          resultFrameRef.current = window.requestAnimationFrame(tick);
        } else {
          resultFrameRef.current = null;
        }
      };
      resultFrameRef.current = window.requestAnimationFrame(tick);
    });
    schedule(2320, () => resultRevealActionRef.current());

    return clearResultRevealTimers;
  }, [screen, totalPoints]);

  useEffect(() => {
    if (screen !== 'results' || resultStage !== 'final') return;
    const frame = window.requestAnimationFrame(() => {
      if (document.activeElement === document.body) {
        resultTitleRef.current?.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screen, resultStage]);

  useEffect(() => {
    if (shareStatus !== 'manual') return;
    const frame = window.requestAnimationFrame(() => {
      manualShareRef.current?.focus();
      manualShareRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      manualShareRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [shareStatus]);

  const cable = useMemo(() => {
    if (screen !== 'question' || !geometry) return null;
    const start = geometry.start;
    let end = pointer ?? { x: start.x, y: start.y + 60 };

    const connectedOrPreviewedParty = !dragging ? (selected ?? previewing) : null;
    if (connectedOrPreviewedParty) {
      const target = geometry.targets[connectedOrPreviewedParty];
      if (target) end = target;
    }

    const verticalDistance = Math.abs(end.y - start.y);
    const bend = Math.max(72, verticalDistance * 0.58);
    return {
      path: `M ${start.x} ${start.y} C ${start.x} ${start.y + bend}, ${end.x} ${end.y - bend}, ${end.x} ${end.y}`,
      end,
    };
  }, [dragging, geometry, pointer, previewing, screen, selected]);
  const isCablePreview = !dragging && selected === null && previewing !== null;
  const cableIsLive = dragging || selected !== null || isCablePreview;

  function ensureAudio() {
    if (typeof window === 'undefined') return null;
    if (!audioRef.current) {
      audioRef.current = new AudioContext();
      const master = audioRef.current.createGain();
      master.gain.value = soundOnRef.current ? 1 : .0001;
      master.connect(audioRef.current.destination);
      sfxMasterRef.current = master;
    }
    if (audioRef.current.state === 'suspended') {
      void audioRef.current.resume().catch(() => undefined);
    }
    return audioRef.current;
  }

  function setSynthSound(enabled: boolean) {
    const audio = enabled ? ensureAudio() : audioRef.current;
    const master = sfxMasterRef.current;
    if (!audio || !master) return;
    const now = audio.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(enabled ? 1 : .0001, now, .018);
  }

  function stopFeedbackCue() {
    const active = feedbackGainRef.current;
    if (!active) return;
    feedbackGainRef.current = null;
    const now = active.context.currentTime;
    active.gain.cancelScheduledValues(now);
    active.gain.setTargetAtTime(.0001, now, .012);
    window.setTimeout(() => active.disconnect(), 80);
  }

  function playCue(cue: Cue, force = false, secondsRemaining = timeLeft) {
    if (!soundOnRef.current && !force) return;
    const audio = ensureAudio();
    if (!audio) return;
    const now = audio.currentTime;
    const baseDestination = sfxMasterRef.current ?? audio.destination;
    let destination: AudioNode = baseDestination;

    if (cue === 'timeout' || cue === 'correct' || cue === 'combo' || cue === 'wrong') {
      stopFeedbackCue();
      const feedbackGain = audio.createGain();
      feedbackGain.gain.setValueAtTime(1, now);
      feedbackGain.connect(baseDestination);
      feedbackGainRef.current = feedbackGain;
      destination = feedbackGain;
    }

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
      gain.connect(destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + duration + 0.03);
    };

    const crackle = (offset: number, duration: number, volume: number) => {
      const frameCount = Math.ceil(audio.sampleRate * duration);
      const buffer = audio.createBuffer(1, frameCount, audio.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < frameCount; index += 1) {
        const snap = Math.random() > .84 ? 1 : .16;
        channel[index] = (Math.random() * 2 - 1) * snap * (1 - index / frameCount);
      }
      const source = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2450, now + offset);
      filter.Q.setValueAtTime(.72, now + offset);
      gain.gain.setValueAtTime(.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(volume, now + offset + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, now + offset + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      source.start(now + offset);
      source.stop(now + offset + duration);
    };

    if (cue === 'connect') {
      [510, 820, 640, 960, 720].forEach((frequency, index) => {
        note(frequency, index * 0.025, 0.055, 'square', 0.018);
      });
      note(160, 0, 0.16, 'sawtooth', 0.032);
      note(430, 0.11, 0.14, 'triangle', 0.045);
      crackle(0, .2, .075);
      crackle(.1, .16, .055);
    }

    if (cue === 'grab') {
      note(92, 0, .28, 'sawtooth', .05);
      note(184, .025, .26, 'triangle', .035);
      note(980, .04, .11, 'square', .028);
      note(1320, .13, .1, 'square', .022);
      crackle(0, .3, .1);
      crackle(.13, .22, .075);
    }

    if (cue === 'start') {
      [262, 392, 523].forEach((frequency, index) => note(frequency, index * 0.09, 0.24));
      note(784, 0.29, 0.42, 'triangle', 0.1);
    }

    if (cue === 'question') {
      crackle(0, .12, .022);
      note(392, .02, .1, 'triangle', .035);
      note(587, .09, .13, 'triangle', .045);
      note(784, .17, .2, 'sine', .05);
    }

    if (cue === 'hover') {
      note(880, 0, .055, 'sine', .012);
      note(1175, .025, .06, 'triangle', .009);
    }

    if (cue === 'countdown') {
      const step = 5 - secondsRemaining;
      note(760 + step * 115, 0, .085, 'square', .021 + step * .006);
      if (secondsRemaining === 5) note(380, .07, .11, 'sine', .022);
      if (secondsRemaining <= 3) {
        const impact = 4 - secondsRemaining;
        note(128 - impact * 13, .018, .12, 'triangle', .025 + impact * .012);
        crackle(.025, .055, .012 + impact * .009);
      }
      if (secondsRemaining === 1) note(54, .075, .22, 'sine', .075);
    }

    if (cue === 'lock') {
      crackle(0, .045, .024);
      note(1450, 0, .035, 'square', .028);
      note(105, .028, .085, 'triangle', .035);
    }

    if (cue === 'transition') {
      note(740, 0, .09, 'triangle', .025);
      note(520, .045, .12, 'triangle', .021);
      crackle(0, .11, .018);
    }

    if (cue === 'share') {
      [784, 1047, 1319].forEach((frequency, index) => {
        note(frequency, index * .055, .22, 'sine', .045);
      });
      crackle(.08, .14, .024);
    }

    if (cue === 'timeout') {
      note(54, 0, .72, 'sine', .16);
      note(82, 0, .28, 'square', .085);
      [196, 147, 110].forEach((frequency, index) => note(frequency, index * .17, .34, 'sawtooth', .075));
      crackle(0, .18, .14);
      crackle(.14, .42, .06);
    }

    if (cue === 'correct') {
      [523, 659, 784, 1047].forEach((frequency, index) => note(frequency, index * 0.1, 0.38, 'triangle', 0.095));
      [523, 659, 784].forEach((frequency) => note(frequency, 0.46, 0.58, 'sine', 0.045));
    }

    if (cue === 'combo') {
      [659, 784, 988, 1319].forEach((frequency, index) => {
        note(frequency, index * .065, .26, index % 2 ? 'sine' : 'triangle', .075);
      });
      note(330, 0, .42, 'sawtooth', .035);
      crackle(.12, .24, .045);
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
      gain.connect(destination);
      oscillator.start(now);
      oscillator.stop(now + 0.64);
    }
  }

  function restoreMusicVolume() {
    Object.entries(musicAudioRef.current).forEach(([key, track]) => {
      if (track) track.volume = MUSIC_VOLUMES[key as MusicCue];
    });
  }

  function resumeDesiredMusic() {
    if (!soundOnRef.current) return;
    const cue = desiredMusicRef.current;
    const desired = musicAudioRef.current[cue];
    if (desired?.paused) switchMusicActionRef.current(cue);
  }

  function primeCrowdAudio() {
    Object.values(crowdAudioRef.current).forEach((track) => {
      if (!track) return;
      const wasMuted = track.muted;
      track.muted = true;
      track.currentTime = 0;
      void track.play().then(() => {
        if (activeCrowdRef.current === track) return;
        track.pause();
        track.currentTime = 0;
        track.muted = wasMuted;
      }).catch(() => {
        if (activeCrowdRef.current !== track) track.muted = wasMuted;
      });
    });
  }

  function stopCrowd() {
    Object.values(crowdAudioRef.current).forEach((track) => {
      track?.pause();
      if (track) {
        track.currentTime = 0;
        track.onended = null;
      }
    });
    activeCrowdRef.current = null;
    restoreMusicVolume();
    resumeDesiredMusic();
  }

  function stopCableHum() {
    const active = cableHumRef.current;
    if (!active) return;
    cableHumRef.current = null;
    const now = active.gain.context.currentTime;
    active.gain.gain.cancelScheduledValues(now);
    active.gain.gain.setTargetAtTime(.0001, now, .022);
    window.setTimeout(() => {
      active.sources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // The source may already have stopped during rapid pointer changes.
        }
      });
    }, 120);
  }

  function startCableHum() {
    if (!soundOn) return;
    stopCableHum();
    const audio = ensureAudio();
    if (!audio) return;
    const now = audio.currentTime;
    const master = audio.createGain();
    const hum = audio.createOscillator();
    const overtone = audio.createOscillator();
    const humGain = audio.createGain();
    const overtoneGain = audio.createGain();
    const noise = audio.createBufferSource();
    const noiseFilter = audio.createBiquadFilter();
    const noiseGain = audio.createGain();

    const noiseFrames = Math.ceil(audio.sampleRate * .42);
    const noiseBuffer = audio.createBuffer(1, noiseFrames, audio.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseFrames; index += 1) {
      const snap = Math.random() > .91 ? 1 : .12;
      noiseData[index] = (Math.random() * 2 - 1) * snap;
    }

    hum.type = 'sawtooth';
    hum.frequency.setValueAtTime(86, now);
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(173, now);
    humGain.gain.setValueAtTime(.55, now);
    overtoneGain.gain.setValueAtTime(.24, now);
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2850, now);
    noiseFilter.Q.setValueAtTime(.82, now);
    noiseGain.gain.setValueAtTime(.55, now);
    master.gain.setValueAtTime(.0001, now);
    master.gain.exponentialRampToValueAtTime(.038, now + .045);

    hum.connect(humGain);
    humGain.connect(master);
    overtone.connect(overtoneGain);
    overtoneGain.connect(master);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    master.connect(sfxMasterRef.current ?? audio.destination);

    hum.start(now);
    overtone.start(now);
    noise.start(now);
    cableHumRef.current = { gain: master, sources: [hum, overtone, noise] };
  }

  function playCrowd(cue: CrowdCue) {
    if (!soundOnRef.current) return;
    stopCrowd();
    const track = crowdAudioRef.current[cue];
    if (!track) return;
    activeCrowdRef.current = track;
    track.muted = false;
    Object.values(musicAudioRef.current).forEach((music) => {
      if (music && !music.paused) music.volume = cue === 'laugh' ? .035 : .05;
    });
    track.currentTime = 0;
    track.onended = () => {
      if (activeCrowdRef.current === track) activeCrowdRef.current = null;
      restoreMusicVolume();
      resumeDesiredMusic();
      track.onended = null;
    };
    void track.play().catch(() => {
      if (activeCrowdRef.current === track) activeCrowdRef.current = null;
      restoreMusicVolume();
      resumeDesiredMusic();
      track.onended = null;
    });
  }

  function pauseMusic(reset = false) {
    musicRequestRef.current += 1;
    Object.values(musicAudioRef.current).forEach((track) => {
      track?.pause();
      if (track && reset) track.currentTime = 0;
    });
    musicReadyRef.current = false;
    musicAttemptedRef.current = false;
    setMusicReady(false);
    setMusicAttempted(false);
  }

  function switchMusic(cue: MusicCue, force = false, restart = false) {
    desiredMusicRef.current = cue;
    if (!soundOn && !force) return;
    const desired = musicAudioRef.current[cue];
    if (!desired) return;
    const request = ++musicRequestRef.current;
    musicAttemptedRef.current = true;
    musicReadyRef.current = false;
    setMusicAttempted(true);
    setMusicReady(false);

    const previousTracks = Object.entries(musicAudioRef.current).filter(
      ([key, track]) => key !== cue && Boolean(track),
    ) as Array<[string, HTMLAudioElement]>;
    desired.loop = true;
    desired.volume = MUSIC_VOLUMES[cue];
    if (restart) desired.currentTime = 0;

    void desired.play().then(() => {
      if (request !== musicRequestRef.current) {
        if (musicAudioRef.current[cue] !== desired || desiredMusicRef.current !== cue) {
          desired.pause();
          desired.currentTime = 0;
        }
        return;
      }
      previousTracks.forEach(([, track]) => {
        track.pause();
        track.currentTime = 0;
      });
      musicReadyRef.current = true;
      setMusicReady(true);
    }).catch(() => {
      if (request !== musicRequestRef.current) return;
      musicReadyRef.current = false;
      musicAttemptedRef.current = false;
      setMusicReady(false);
      setMusicAttempted(false);
    });
  }

  function toggleSound() {
    if (soundOn && !musicReadyRef.current) {
      primeCrowdAudio();
      setSynthSound(true);
      switchMusic(screen === 'question' ? 'game' : 'intro', true, true);
      playCue('connect', true);
      return;
    }

    if (soundOn) {
      stopCrowd();
      stopCableHum();
      stopFeedbackCue();
      setSynthSound(false);
      pauseMusic();
      setSoundOn(false);
      return;
    }

    setSoundOn(true);
    primeCrowdAudio();
    setSynthSound(true);
    playCue('connect', true);
    switchMusic(screen === 'question' ? 'game' : 'intro', true, true);
  }

  function clearActionTimers() {
    if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    revealTimerRef.current = null;
    transitionTimerRef.current = null;
  }

  function clearResultRevealTimers() {
    resultTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    resultTimersRef.current = [];
    if (resultFrameRef.current !== null) {
      window.cancelAnimationFrame(resultFrameRef.current);
      resultFrameRef.current = null;
    }
  }

  function completeResultReveal() {
    if (resultRevealFinishedRef.current) return;
    resultRevealFinishedRef.current = true;
    clearResultRevealTimers();
    setDisplayedPoints(totalPoints);
    setResultStage('final');
    playCue('combo');
    playCrowd(score > 0 ? 'cheer' : 'laugh');
  }

  function finishResultReveal() {
    completeResultReveal();
  }

  async function shareResults(text: string) {
    if (sharePendingRef.current) return;
    sharePendingRef.current = true;
    setSharePending(true);
    const url = `${window.location.origin}${window.location.pathname}`;
    const shareData = {
      title: 'Vem sa vad? – Valspecial 2026',
      text,
      url,
    };
    setShareStatus('idle');
    setManualShareText('');

    try {
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          setShareStatus('shared');
          playCue('share');
          return;
        } catch (error) {
          if (isAbortError(error)) return;
        }
      }

      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShareStatus('copied');
        playCue('share');
      } catch {
        setManualShareText(`${text}\n${url}`);
        setShareStatus('manual');
      }
    } finally {
      sharePendingRef.current = false;
      setSharePending(false);
    }
  }

  function motionDelay(milliseconds: number) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : milliseconds;
  }

  function previewParty(party: PartyId) {
    if (phase !== 'choosing' || resolvedRef.current) return;
    const now = performance.now();
    const previous = hoverCueRef.current;
    if (now - previous.at < 90 || (previous.party === party && now - previous.at < 500)) return;
    hoverCueRef.current = { party, at: now };
    playCue('hover');
  }

  function resetPartyPreview() {
    hoveredPartyRef.current = null;
    focusedPartyRef.current = null;
    dragTargetRef.current = null;
    setPreviewing(null);
  }

  function startPointerPreview(party: PartyId) {
    if (phase !== 'choosing' || resolvedRef.current) return;
    hoveredPartyRef.current = party;
    setPreviewing(focusedPartyRef.current ?? party);
    previewParty(party);
  }

  function stopPointerPreview(party: PartyId) {
    if (hoveredPartyRef.current === party) hoveredPartyRef.current = null;
    setPreviewing(focusedPartyRef.current ?? hoveredPartyRef.current);
  }

  function startFocusPreview(party: PartyId) {
    if (phase !== 'choosing' || resolvedRef.current) return;
    focusedPartyRef.current = party;
    setPreviewing(party);
    previewParty(party);
  }

  function stopFocusPreview(party: PartyId) {
    if (focusedPartyRef.current === party) focusedPartyRef.current = null;
    setPreviewing(focusedPartyRef.current ?? hoveredPartyRef.current);
  }

  function startGame() {
    clearActionTimers();
    clearResultRevealTimers();
    stopFeedbackCue();
    stopCrowd();
    stopCableHum();
    primeCrowdAudio();
    resolvedRef.current = false;
    selectedRef.current = null;
    resetPartyPreview();
    setRoundQuotes(buildRound(quotes));
    setAnswers([]);
    setCurrentIndex(0);
    setSelected(null);
    setPointer(null);
    setDragging(false);
    setPhase('category');
    setTimedOut(false);
    setAutoLocked(false);
    setResultStage('countdown');
    setResultCountdown(3);
    setDisplayedPoints(0);
    setShareStatus('idle');
    setManualShareText('');
    sharePendingRef.current = false;
    setSharePending(false);
    resultRevealFinishedRef.current = false;
    setTimeLeft(QUESTION_SECONDS);
    setScreen('question');
    playCue('start');
    switchMusic('game', false, true);
  }

  function connectParty(party: PartyId) {
    if (phase !== 'choosing' || resolvedRef.current) return;
    if (selectedRef.current === party) {
      revealChoice(party);
      return;
    }
    resetPartyPreview();
    selectedRef.current = party;
    setSelected(party);
    setPointer(null);
    setDragging(false);
    playCue('connect');
  }

  function commitAnswer(
    choice: PartyId | null,
    resolution: Answer['resolution'],
    secondsRemaining: number,
  ) {
    if (phase !== 'choosing' || resolvedRef.current) return null;
    resolvedRef.current = true;
    const frozenSeconds = Math.max(
      0,
      Math.min(QUESTION_SECONDS, Math.round(secondsRemaining)),
    );
    const streakBefore = trailingCorrectStreak(answers);
    const correct = choice === current.party;
    const answer: Answer = {
      questionIndex: currentIndex,
      quoteId: current.id,
      party: current.party,
      chosen: choice,
      correct,
      resolution,
      secondsLeft: frozenSeconds,
      streakBefore,
      points: calculatePoints(correct, frozenSeconds, streakBefore),
    };
    setAnswers((previous) => (
      previous.some((existing) => existing.questionIndex === currentIndex)
        ? previous
        : [...previous, answer]
    ));
    return answer;
  }

  function revealChoice(choice: PartyId, lockedByTimer = false) {
    const answer = commitAnswer(
      choice,
      lockedByTimer ? 'auto-lock' : 'manual',
      lockedByTimer ? 0 : timeLeft,
    );
    if (!answer) return;
    resetPartyPreview();
    stopCableHum();
    setSelected(choice);
    setTimedOut(false);
    setAutoLocked(lockedByTimer);
    setPhase('locking');
    playCue('lock');
    revealTimerRef.current = window.setTimeout(() => {
      revealTimerRef.current = null;
      setPhase('reveal');
      playCue(answer.correct && answer.streakBefore >= 1 ? 'combo' : answer.correct ? 'correct' : 'wrong');
      playCrowd(answer.correct ? 'cheer' : 'boo');
    }, motionDelay(110));
  }

  function submitAnswer() {
    const choice = selectedRef.current;
    if (!choice) return;
    revealChoice(choice);
  }

  function handleQuestionExpired() {
    if (phase !== 'choosing' || resolvedRef.current) return;
    resetPartyPreview();
    stopCableHum();
    setDragging(false);
    setPointer(null);
    playCue('timeout');
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigator.vibrate?.([90, 35, 170]);
    }

    const choice = selectedRef.current;
    if (choice) {
      revealChoice(choice, true);
      return;
    }

    const answer = commitAnswer(null, 'timeout', 0);
    if (!answer) return;
    setTimedOut(true);
    setAutoLocked(false);
    setPhase('reveal');
    playCrowd('laugh');
  }

  function startCable(event: PointerEvent<HTMLSpanElement>) {
    if (phase !== 'choosing' || resolvedRef.current) return;
    resetPartyPreview();
    event.currentTarget.setPointerCapture(event.pointerId);
    playCue('grab');
    startCableHum();
    selectedRef.current = null;
    setSelected(null);
    setDragging(true);
    setPointer({ x: event.clientX, y: event.clientY });
  }

  function partyAtPoint(clientX: number, clientY: number) {
    const party = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>('[data-party]')
      ?.dataset.party as PartyId | undefined;
    return party ?? null;
  }

  function moveCable(event: PointerEvent<HTMLSpanElement>) {
    if (!dragging || phase !== 'choosing') return;
    setPointer({ x: event.clientX, y: event.clientY });

    const dragTarget = partyAtPoint(event.clientX, event.clientY);
    if (dragTargetRef.current === dragTarget) return;
    dragTargetRef.current = dragTarget;
    setPreviewing(dragTarget);
    if (dragTarget) previewParty(dragTarget);
  }

  function dropCable(event: PointerEvent<HTMLSpanElement>) {
    if (!dragging || phase !== 'choosing') return;
    const party = partyAtPoint(event.clientX, event.clientY);
    setDragging(false);
    setPointer(null);
    stopCableHum();
    if (party) {
      connectParty(party);
      return;
    }
    resetPartyPreview();
  }

  function cancelCable() {
    stopCableHum();
    setDragging(false);
    setPointer(null);
    resetPartyPreview();
  }

  function nextQuestion() {
    if (phase !== 'reveal' || transitionTimerRef.current !== null) return;
    resetPartyPreview();
    stopFeedbackCue();
    stopCrowd();
    stopCableHum();
    if (currentIndex === roundQuotes.length - 1) {
      clearResultRevealTimers();
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      resultRevealFinishedRef.current = reduceMotion;
      setResultStage(reduceMotion ? 'final' : 'countdown');
      setResultCountdown(3);
      setDisplayedPoints(reduceMotion ? totalPoints : 0);
      setShareStatus('idle');
      setManualShareText('');
      sharePendingRef.current = false;
      setSharePending(false);
      setScreen('results');
      switchMusic('intro', false, true);
      return;
    }
    setPhase('transition');
    playCue('transition');
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      resolvedRef.current = false;
      selectedRef.current = null;
      setCurrentIndex((index) => index + 1);
      setSelected(null);
      setPointer(null);
      setDragging(false);
      setTimedOut(false);
      setAutoLocked(false);
      setTimeLeft(QUESTION_SECONDS);
      setPhase('category');
      switchMusicActionRef.current('game', false, true);
    }, motionDelay(260));
  }

  function returnHome() {
    clearActionTimers();
    clearResultRevealTimers();
    stopFeedbackCue();
    stopCrowd();
    stopCableHum();
    resolvedRef.current = false;
    selectedRef.current = null;
    resetPartyPreview();
    setScreen('intro');
    setPhase('choosing');
    setSelected(null);
    setPointer(null);
    setDragging(false);
    setTimedOut(false);
    setAutoLocked(false);
    setResultStage('countdown');
    setResultCountdown(3);
    setDisplayedPoints(0);
    setShareStatus('idle');
    setManualShareText('');
    sharePendingRef.current = false;
    setSharePending(false);
    resultRevealFinishedRef.current = false;
    setTimeLeft(QUESTION_SECONDS);
    switchMusic('intro', false, true);
  }

  const soundButton = (
    <button
      className={[
        'sound-button',
        screen === 'question' ? 'in-game' : '',
        screen === 'results' ? 'results-sound' : '',
        needsMusicUnlock ? 'needs-unlock' : '',
      ].filter(Boolean).join(' ')}
      aria-label={needsMusicUnlock ? 'Starta musik och ljud' : soundOn ? 'Stäng av ljud' : 'Slå på ljud'}
      title={needsMusicUnlock ? 'Starta musik och ljud' : soundOn ? 'Stäng av ljud' : 'Slå på ljud'}
      onClick={toggleSound}
    >
      <span aria-hidden="true">{needsMusicUnlock ? '♫' : soundOn ? '🔊' : '🔇'}</span>
    </button>
  );

  if (screen === 'intro') {
    return (
      <main className="intro-screen">
        <div className="intro-stage" aria-hidden="true">
          <div className="intro-stage-backdrop" />
          <div className="intro-stage-depth" />
          <div className="sweep sweep-one" />
          <div className="sweep sweep-two" />
          <IntroConfetti />
          <div className="intro-stage-lineup" />
          <div className="intro-floor-shine" />
        </div>
        <section className="intro-console" aria-labelledby="intro-title">
          <h1 className="intro-logo" id="intro-title">
            <span className="sr-only">Vem sa vad? – Valspecial 2026</span>
            <span className="intro-logo-art" aria-hidden="true">
              <picture>
                <source
                  media="(max-width: 700px)"
                  srcSet="/branding/vem-sa-vad-marquee-960.webp"
                />
                <img
                  className="intro-logo-image"
                  src="/branding/vem-sa-vad-marquee.webp"
                  width="1893"
                  height="831"
                  alt=""
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </picture>
              <span className="intro-logo-sheen" />
              <span className="intro-logo-flares">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
          </h1>
          <button className="start-button" onClick={startGame} aria-describedby="intro-note">
            <span>Starta spelet</span>
            <small>Koppla citaten till rätt parti</small>
          </button>
          <div className="intro-kicker">
            8 partier · en himla massa citat
          </div>
        </section>
        <p className="intro-note" id="intro-note">
          Ett fristående spel utan koppling till partierna. Källor visas efter varje svar. Historiska citat behöver inte motsvara partiernas politik i dag.
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
    const bestPartyCopy = bestAccuracy > 0
      ? `Bäst koll hade jag på ${bestParties.map(({ party }) => party.name).join(', ')}.`
      : '';
    const shareText = [
      `Jag fick ${formatPoints(totalPoints)} poäng och ${score}/${answers.length} rätt i Vem sa vad? – Valspecial 2026!`,
      `⚡ Bästa svit: ${bestStreak}.`,
      bestPartyCopy,
      'Kan du slå mig?',
    ].filter(Boolean).join(' ');

    return (
      <main className={`results-screen result-stage-${resultStage}`}>
        <div className="results-rays" aria-hidden="true" />
        <div className="results-flash" aria-hidden="true" />
        {(resultStage === 'countdown' || resultStage === 'opening') && (
          <div className={`result-reveal is-${resultStage}`}>
            <span className="result-curtain is-left" aria-hidden="true" />
            <span className="result-curtain is-right" aria-hidden="true" />
            <div className="result-reveal-copy" aria-hidden="true">
              <small>Den slutgiltiga domen</small>
              {resultStage === 'countdown' ? (
                <strong key={resultCountdown}>{resultCountdown}</strong>
              ) : (
                <strong>NU!</strong>
              )}
              <span>Poängen laddas…</span>
            </div>
            {resultStage === 'countdown' && (
              <button className="result-skip" type="button" onClick={finishResultReveal}>
                Visa direkt
              </button>
            )}
          </div>
        )}
        {resultStage === 'final' && score > 0 && (
          <Confetti intensity={score === answers.length ? 'full' : 'spark'} />
        )}
        {soundButton}
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {resultStage === 'final'
            ? `Slutresultat: ${formatPoints(totalPoints)} poäng, ${score} rätt av ${answers.length}. Bästa svit ${bestStreak}.`
            : 'Resultatet räknas.'}
        </p>
        <section
          className={`results-card stage-${resultStage}`}
          aria-label={resultStage === 'final' ? 'Slutresultat' : 'Resultatet räknas'}
        >
          <p className="results-kicker">
            {resultStage === 'counting' ? 'Poängen räknas' : 'Slutresultat'}
          </p>
          <div
            className="score-burst is-points"
            aria-label={resultStage === 'final' ? `${formatPoints(totalPoints)} poäng` : 'Poängen räknas'}
            aria-live={resultStage === 'final' ? 'polite' : 'off'}
          >
            <small>Din poäng</small>
            <strong>{formatPoints(displayedPoints)}</strong>
            <span>poäng</span>
          </div>
          <div className="result-details" aria-hidden={resultStage !== 'final'}>
            <p className="result-energy">
              <span><strong>{score}</strong> / {answers.length} rätt</span>
              <span aria-hidden="true"> · </span>
              <span>Bästa svit: <strong>{bestStreak}</strong></span>
              <span aria-hidden="true"> · </span>
              <span>Blixtsnabba: <strong>{answers.filter((answer) => answer.correct && answer.secondsLeft >= 15).length}</strong></span>
            </p>
            <h1 id="result-title" ref={resultTitleRef} tabIndex={-1}>{resultTitle}</h1>
            <p className="results-copy">
              Det här mäter din magkänsla för vem som låter som vem — inte vad du själv tycker.
            </p>

            <div className="result-parties" aria-label="Resultat per parti">
              {partyResults.map(({ party, correct, total }, resultIndex) => {
                const perfect = total > 0 && correct === total;
                const partial = correct > 0 && !perfect;
                return (
                  <div
                    key={party.id}
                    className={`result-party ${perfect ? 'got-it' : partial ? 'partly-it' : 'missed-it'}`}
                    style={{
                      '--party': party.color,
                      '--party-ink': party.ink,
                      '--result-index': resultIndex,
                    } as CSSProperties}
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
              <button
                className="share-action"
                type="button"
                onClick={() => void shareResults(shareText)}
                disabled={sharePending}
                aria-busy={sharePending}
              >
                <span aria-hidden="true">↗</span>
                {sharePending ? 'Öppnar delning…' : 'Dela mina poäng'}
              </button>
              <button className="primary-action" type="button" onClick={startGame}>Spela igen</button>
              <button className="secondary-action" type="button" onClick={returnHome}>Till startscenen</button>
            </div>
            <p className={`share-status is-${shareStatus}`} role="status" aria-live="polite" aria-atomic="true">
              {shareStatus === 'shared'
                ? 'Resultatet delades!'
                : shareStatus === 'copied'
                  ? 'Resultatet och länken kopierades!'
                  : shareStatus === 'manual'
                    ? 'Markera texten nedan och kopiera den.'
                    : ''}
            </p>
            {shareStatus === 'manual' && (
              <label className="manual-share">
                <span>Ditt delningsmeddelande</span>
                <textarea
                  ref={manualShareRef}
                  readOnly
                  value={manualShareText}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
            )}
            <p className="scoring-note">
              Poäng: 1 000 för rätt svar + 25 per sekund kvar + svitbonus upp till 500.
            </p>
          </div>
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
      isCablePreview ? 'cable-live is-previewing-cable' : '',
      phase === 'choosing' && timeLeft <= 5 ? 'timer-critical' : '',
      timeLeft === 0 ? 'timer-exploded' : '',
      showingAnswer ? (wasCorrect ? 'answer-correct' : 'answer-wrong') : '',
    ].filter(Boolean).join(' ')}>
      <div className="stage-lights" aria-hidden="true" />
      <div className="urgency-vignette" aria-hidden="true" />
      {phase === 'category' && (
        <QuestionEntryBurst
          key={`entry-${current.id}`}
          number={currentIndex + 1}
          theme={currentTheme.label}
          description={currentTheme.description}
        />
      )}
      {phase === 'reveal' && lastAnswer?.quoteId === current.id && (
        <FeedbackBurst
          key={`feedback-${current.id}`}
          answer={lastAnswer}
          streak={streak}
          milestone={currentMilestone}
        />
      )}
      {showingAnswer && wasCorrect && (
        <VictoryShow key={`victory-${current.id}`} party={correctParty} />
      )}
      {phase === 'reveal' && wasCorrect && (
        <Confetti intensity={streak >= 3 ? 'full' : 'spark'} />
      )}
      <p className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        {showingAnswer
          ? `${timedOut ? 'Tiden är ute utan något val.' : autoLocked ? `Tiden är ute och valet ${selectedParty?.name} låstes automatiskt. ${wasCorrect ? 'Rätt svar.' : 'Fel svar.'}` : wasCorrect ? 'Rätt svar.' : `Fel svar. Du valde ${selectedParty?.name}.`} ${currentFeedback ? `${currentFeedback.headline} ${currentFeedback.detail}.` : ''} ${lastAnswer?.quoteId === current.id ? `${scoreBreakdown(lastAnswer)}. Totalt ${formatPoints(totalPoints)} poäng.` : ''} ${currentMilestone ?? ''} Rätt parti är ${correctParty.name}. Citatet sades av ${current.speaker} år ${current.date.slice(0, 4)}.`
          : phase === 'locking'
            ? `Svaret ${selectedParty?.name} är låst.`
          : selectedParty
            ? `${selectedParty.name} är inkopplat. Tryck på Svara när du är redo.`
            : ''}
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {phase === 'category'
          ? `Tema: ${currentTheme.label}. ${currentTheme.description}.`
          : phase === 'choosing' && (timeLeft === 7 || timeLeft === 3)
            ? `${timeLeft} sekunder kvar.`
            : ''}
      </p>

      <header className="game-header">
        <button className="mini-brand" onClick={returnHome}>
          Vem sa vad?
        </button>
        <div className="header-center">
          <div className="progress-pill">
            <span className="question-progress-copy">
              Fråga <strong>{currentIndex + 1}</strong><i> av {roundQuotes.length}</i>
            </span>
            <span
              className={`score-inline ${currentPointGain !== null ? 'is-updating' : ''}`}
              aria-label={`${formatPoints(totalPoints)} poäng`}
              title="1 000 grundpoäng för rätt svar, plus tid och svitbonus"
            >
              <small>Poäng</small>
              <strong key={totalPoints}>{formatPoints(totalPoints)}</strong>
              {currentPointGain !== null && (
                <em key={`${current.id}-${currentPointGain}`}>
                  {currentPointGain ? `+${formatPoints(currentPointGain)}` : '+0'}
                </em>
              )}
            </span>
            {streak >= 2 && (
              <span className="streak-inline" key={streak}>
                ⚡ <strong>{streak}</strong><i> i rad</i>
              </span>
            )}
          </div>
          <div
            className={[
              'timer-console',
              timeLeft <= 7 ? 'is-warning' : '',
              timeLeft <= 4 ? 'is-danger' : '',
              timeLeft <= 3 ? 'is-final' : '',
              phase !== 'choosing' ? 'is-stopped' : '',
              timedOut ? 'is-timeout' : '',
            ].filter(Boolean).join(' ')}
            style={{
              '--fuse': `${timerRatio * 100}%`,
              '--timer-scale': timerScale,
              '--timer-shell-scale': timerShellScale,
            } as CSSProperties}
            role="timer"
            aria-label={phase === 'category' ? 'Frågan börjar snart' : phase === 'choosing' ? `${timeLeft} sekunder kvar` : `Tiden stannade på ${timeLeft} sekunder`}
          >
            <span className="timer-number" aria-hidden="true">
              <strong><i key={timeLeft}>{timeLeft}</i></strong>
              <small>sek</small>
            </span>
            {timeLeft === 0 && <span className="timer-bang" aria-hidden="true">BAAANG!</span>}
            <span className="timer-fuse" aria-hidden="true">
              <span className="fuse-track">
                <span className="fuse-remaining">
                  <i className="fuse-flame" />
                </span>
              </span>
              <b>{phase === 'category' ? 'REDO' : phase === 'choosing' ? 'TID KVAR' : 'STOPP'}</b>
            </span>
          </div>
        </div>
        {soundButton}
      </header>

      <div
        className="round-progress"
        aria-hidden={phase === 'category'}
        role="progressbar"
        aria-label={`${visibleAnswers.length} av ${roundQuotes.length} frågor besvarade`}
        aria-valuemin={0}
        aria-valuemax={roundQuotes.length}
        aria-valuenow={visibleAnswers.length}
        aria-valuetext={`${visibleAnswers.length} besvarade: ${score} rätt, ${wrongCount} fel, ${timeoutCount} tiden ute`}
      >
        {roundQuotes.map((quote, index) => {
          const answer = visibleAnswers[index];
          return (
            <i
              key={quote.id}
              className={[
                index === currentIndex && !showingAnswer ? 'is-current' : '',
                answer?.correct
                  ? 'is-correct'
                  : answer?.resolution === 'timeout'
                    ? 'is-timeout'
                    : answer
                      ? 'is-wrong'
                      : '',
                (index + 1) % 6 === 0 ? 'is-act' : '',
              ].filter(Boolean).join(' ')}
              aria-hidden="true"
            />
          );
        })}
      </div>

      <section
        className="game-content"
        aria-labelledby="instruction"
        aria-hidden={phase === 'category'}
      >
        <div className="question-meta">
          <p ref={instructionRef} className="eyebrow" id="instruction" tabIndex={-1}>
            {phase === 'category'
              ? 'Temat presenteras'
              : phase === 'choosing'
              ? 'Koppla citatet till ett parti'
              : phase === 'locking'
                ? 'Svaret låses'
                : phase === 'transition'
                  ? 'Nästa fråga laddas'
                  : 'Ridån går upp'}
          </p>
          <p
            key={current.id}
            id="question-theme"
            className={`theme-badge theme-${currentTheme.id}`}
            aria-label={`Tema: ${currentTheme.label}. ${currentTheme.description}`}
          >
            <span className="theme-mark" aria-hidden="true">{currentTheme.mark}</span>
            <span className="theme-copy">
              <small>Tema</small>
              <strong>{currentTheme.label}</strong>
              <span>{currentTheme.description}</span>
            </span>
          </p>
        </div>

        <article
          key={current.id}
          className={[
            'quote-card',
            `quote-theme-${current.theme}`,
            current.quote.length <= 72
              ? 'quote-length-short'
              : current.quote.length >= 150
                ? 'quote-length-long'
                : 'quote-length-medium',
          ].join(' ')}
          aria-describedby="question-theme"
        >
          {showingAnswer && (
            <div className={`reveal-ribbon ${wasCorrect ? 'is-right' : 'is-wrong'}`} aria-hidden="true">
              {timedOut ? 'Tiden är ute!' : autoLocked ? 'Tiden låste valet!' : wasCorrect ? 'Rätt svar!' : 'Inte riktigt!'}
            </div>
          )}
          <span className="quote-mark opening" aria-hidden="true">“</span>
          <blockquote>
            <QuoteTypography quote={current} />
          </blockquote>
          <span className="quote-mark closing" aria-hidden="true">”</span>
          <span
            ref={jackRef}
            className={`cable-jack ${dragging ? 'is-dragging' : ''} ${selected ? 'is-connected' : ''} ${isCablePreview ? 'is-previewing' : ''}`}
            aria-hidden="true"
            onPointerDown={startCable}
            onPointerMove={moveCable}
            onPointerUp={dropCable}
            onPointerCancel={cancelCable}
            onLostPointerCapture={cancelCable}
          >
            <span className="jack-grip" />
            <span className="jack-sparks" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
            </span>
            <span className="drag-callout" aria-hidden="true">
              <i>←</i>
              <b>
                <span className="drag-copy-desktop">Klicka &amp; dra</span>
                <span className="drag-copy-mobile">Tryck &amp; dra</span>
              </b>
            </span>
          </span>
        </article>

        <div className="party-grid" role="group" aria-label="Välj parti – aktivera ett podium för att koppla kabeln">
          {parties.map((party, partyIndex) => {
            const isSelected = selected === party.id;
            const isPreviewing = phase === 'choosing' && previewing === party.id && !isSelected;
            const isCorrect = showingAnswer && current.party === party.id;
            const isWrong = showingAnswer && isSelected && !isCorrect;
            const isMuted = showingAnswer && !isCorrect && !isSelected;
            const showLeaders = isSelected || isCorrect;
            return (
              <button
                key={party.id}
                data-party={party.id}
                className={[
                  'party-podium',
                  isPreviewing ? 'is-previewing' : '',
                  isSelected ? 'is-selected' : '',
                  isCorrect ? 'is-correct' : '',
                  isWrong ? 'is-wrong' : '',
                  isMuted ? 'is-muted' : '',
                ].filter(Boolean).join(' ')}
                style={{
                  '--party': party.color,
                  '--party-ink': party.ink,
                  '--podium-index': partyIndex,
                } as CSSProperties}
                onClick={() => connectParty(party.id)}
                onPointerEnter={(event) => {
                  if (event.pointerType !== 'touch') startPointerPreview(party.id);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== 'touch') stopPointerPreview(party.id);
                }}
                onFocus={() => startFocusPreview(party.id)}
                onBlur={() => stopFocusPreview(party.id)}
                disabled={phase !== 'choosing'}
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
                <span className="party-short-name" aria-hidden="true">{party.shortName}</span>
              </button>
            );
          })}
        </div>

        <LeaderGallery state={leaderGalleryState} />

        {phase === 'category' || phase === 'choosing' || phase === 'locking' ? (
          <div className={`selection-console ${selectedParty ? 'is-armed' : ''} ${phase === 'locking' ? 'is-locking' : ''}`}>
            {selectedParty ? (
              <>
                <p>
                  <span className="power-dot" aria-hidden="true" />
                  Kabeln leder till <strong>{selectedParty.name}</strong>
                </p>
                <button ref={lockAnswerRef} className="lock-answer" onClick={submitAnswer} disabled={phase === 'locking'}>
                  {phase === 'locking' ? 'Låst!' : 'Svara'}
                  <span aria-hidden="true"> {phase === 'locking' ? '✓' : '⚡'}</span>
                </button>
                <small>
                  {phase === 'locking'
                    ? 'Publiken håller andan…'
                    : 'Dra om kabeln eller välj ett annat podium för att byta.'}
                </small>
              </>
            ) : (
              <p className="game-hint">
                Dra i den gula kontakten — eller tryck direkt på ett podium.
              </p>
            )}
          </div>
        ) : (
          <aside
            ref={revealPanelRef}
            key={`reveal-${current.id}`}
            className={`reveal-panel ${wasCorrect ? 'panel-correct' : 'panel-wrong'}`}
            tabIndex={-1}
            style={{
              '--reveal-party': correctParty.color,
              '--reveal-ink': correctParty.ink,
            } as CSSProperties}
          >
            <span className="reveal-chase-lights" aria-hidden="true" />
            <div className="reveal-verdict">
              <RevealShowcard
                quote={current}
                party={correctParty}
                chosen={selectedParty}
                correct={wasCorrect}
              />
              <div className="verdict-copy">
                <span>
                  {timedOut
                    ? 'Publiken hann före dig!'
                    : autoLocked
                      ? (wasCorrect ? 'Precis på håret!' : 'Valet låstes på noll!')
                      : wasCorrect
                        ? 'Du satte den!'
                        : `Du valde ${selectedParty?.name}`}
                </span>
                <strong>
                  <small>Rätt parti</small>
                  {correctParty.name}
                </strong>
              </div>
            </div>
            <div className="source-story">
              <span className="source-kicker">Citatet sades av</span>
              <p className="speaker-line">
                <strong>{current.speaker}</strong>
                <span>{current.speakerRole}</span>
              </p>
              <time className="source-date" dateTime={current.date}>{formatDate(current.date)}</time>
              <p className="source-context">{current.context}</p>
              <p className="historical-note">
                Detta sades {current.date.slice(0, 4)} och behöver inte motsvara partiets politik i dag.
              </p>
              {current.aftermath && (
                <details className="aftermath-card">
                  <summary>
                    <span className="aftermath-kicker">Vad hände sen?</span>
                    <strong>{current.aftermath.headline}</strong>
                    <span className="aftermath-toggle" aria-hidden="true">
                      <b>Öppna</b>
                      <i>+</i>
                    </span>
                  </summary>
                  <div className="aftermath-body">
                    <time dateTime={current.aftermath.date}>{formatDate(current.aftermath.date)}</time>
                    <p>{current.aftermath.summary}</p>
                    <div className="aftermath-sources" aria-label="Källor till vad som hände sedan">
                      {current.aftermath.sources.map((source, index) => (
                        <div className="aftermath-source" key={source.url}>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Öppna belägg ${index + 1}, ${source.title} hos ${source.publisher}, i en ny flik`}
                          >
                            <b>Belägg {index + 1}</b>
                            {source.publisher}
                            <span aria-hidden="true"> ↗</span>
                          </a>
                          <small>{source.title} · {source.locator}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}
              {current.editorialNote && (
                <details className="editorial-note">
                  <summary>Ytterligare förklaring</summary>
                  <p>{current.editorialNote}</p>
                </details>
              )}
              <div className="source-link-block">
                <a
                  href={current.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Öppna citatet i original: ${current.source.title}${current.source.locator ? `, ${current.source.locator}` : ''}, hos ${current.source.publisher}. Öppnas i en ny flik.`}
                >
                  <span className="source-link-heading">
                    <em>Originalkälla</em>
                    <strong>{current.source.publisher}</strong>
                  </span>
                  <small>
                    {current.source.title}
                    {current.source.locator ? ` · ${current.source.locator}` : ''}
                  </small>
                  <b aria-hidden="true">↗</b>
                </a>
              </div>
            </div>
            <button
              ref={nextButtonRef}
              className="next-button"
              onClick={nextQuestion}
              disabled={phase === 'transition'}
            >
              <span className="next-button-copy">
                <strong>
                  {phase === 'transition'
                    ? 'Nästa…'
                    : currentIndex === roundQuotes.length - 1
                      ? 'Visa resultatet'
                      : 'Nästa citat'}
                </strong>
                <small>{currentIndex === roundQuotes.length - 1 ? 'Dags för domen' : 'Fortsätt showen'}</small>
              </span>
              <b aria-hidden="true">→</b>
            </button>
          </aside>
        )}
      </section>

      <svg className={`cable-layer ${cableIsLive ? 'is-live' : ''} ${isCablePreview ? 'is-previewing' : ''}`} aria-hidden="true">
        {cable && (
          <>
            <path className="cable-aura" d={cable.path} />
            <path className="cable-shadow" d={cable.path} />
            <path className="cable-core" d={cable.path} />
            <path className="cable-hotline" d={cable.path} pathLength="100" />
            <path className="cable-current cable-current-gold" d={cable.path} pathLength="100" />
            <path className="cable-current cable-current-blue" d={cable.path} pathLength="100" />
            <path className="cable-charge charge-one" d={cable.path} pathLength="100" />
            <path className="cable-charge charge-two" d={cable.path} pathLength="100" />
            <path className="cable-charge charge-three" d={cable.path} pathLength="100" />
            {cableIsLive && (
              <>
                <circle className="electric-halo" cx={cable.end.x} cy={cable.end.y} r="39" />
                <circle className="electric-ring electric-ring-outer" cx={cable.end.x} cy={cable.end.y} r="31" />
                <circle className="electric-ring" cx={cable.end.x} cy={cable.end.y} r="22" />
                <circle className="cable-plug" cx={cable.end.x} cy={cable.end.y} r="13" />
                <g className="spark-burst" transform={`translate(${cable.end.x} ${cable.end.y})`}>
                  <line x1="-18" y1="-4" x2="-30" y2="-9" />
                  <line x1="15" y1="-13" x2="24" y2="-23" />
                  <line x1="18" y1="7" x2="31" y2="12" />
                  <line x1="-8" y1="18" x2="-13" y2="30" />
                  <line x1="2" y1="-21" x2="4" y2="-35" />
                  <line x1="21" y1="-1" x2="37" y2="-3" />
                  <line x1="10" y1="18" x2="18" y2="33" />
                  <line x1="-17" y1="13" x2="-29" y2="23" />
                  <polyline points="-15,-15 -24,-24 -19,-30 -29,-42" />
                  <polyline points="15,14 23,22 18,29 29,39" />
                  <polyline points="15,-8 27,-13 25,-20 40,-25" />
                  <circle cx="-39" cy="5" r="2.8" />
                  <circle cx="34" cy="18" r="2.4" />
                  <circle cx="-4" cy="-42" r="2.2" />
                </g>
              </>
            )}
            {selected === null && !isCablePreview && (
              <g
                className={`cable-frayed-end ${dragging ? 'is-dragging' : ''}`}
                transform={`translate(${cable.end.x} ${cable.end.y})`}
              >
                <rect className="cable-end-collar" x="-14" y="-9" width="28" height="17" rx="5" />
                <path className="frayed-wire wire-red" d="M -7 5 C -9 12, -14 17, -17 25" />
                <path className="frayed-wire wire-blue" d="M 0 5 C -1 13, 1 19, 0 28" />
                <path className="frayed-wire wire-earth" d="M 7 5 C 10 12, 14 17, 17 25" />
                <path className="copper-tip tip-red" d="M -17 24 L -20 31" />
                <path className="copper-tip tip-blue" d="M 0 27 L 0 35" />
                <path className="copper-tip tip-earth" d="M 17 24 L 20 31" />
              </g>
            )}
          </>
        )}
      </svg>
    </main>
  );
}

function LeaderGallery({ state }: { state: LeaderGalleryState }) {
  const spritePath = (pose: LeaderGalleryState, leaderId: string) =>
    `/sprites/leader-gallery/${pose}-${leaderId}.webp${pose === 'cheer' ? '?v=2' : ''}`;

  return (
    <div
      className={`leader-gallery is-${state}`}
      aria-hidden="true"
    >
      <span className="leader-gallery-stage">
        {leaderGallerySlots.map((slot, slotIndex) => (
          <span
            className={`leader-gallery-slot ${slot.length > 1 ? 'is-duo' : ''}`}
            key={slotIndex}
          >
            {slot.map((leader, memberIndex) => {
              const index = leaderGallerySlots
                .slice(0, slotIndex)
                .reduce((total, previousSlot) => total + previousSlot.length, memberIndex);
              return (
                <span
                  className="leader-gallery-character"
                  key={leader.id}
                  style={{
                    '--leader-delay': `${-(index * .29)}s`,
                    '--leader-speed': `${2.05 + (index % 4) * .27}s`,
                    '--leader-drift': `${index % 2 ? 9 + index : -(9 + index)}px`,
                    '--leader-up': `${-(6 + (index % 3) * 3)}px`,
                    '--leader-tilt': `${index % 2 ? 2.4 : -2.4}deg`,
                  } as CSSProperties}
                >
                  <img
                    key={`${state}-${leader.id}`}
                    src={spritePath(state, leader.id)}
                    alt=""
                    title={leader.name}
                    width={slot.length > 1 ? 64 : 128}
                    height={180}
                    decoding="async"
                    draggable={false}
                  />
                </span>
              );
            })}
          </span>
        ))}
      </span>
      {state === 'roam' && (
        <span className="leader-gallery-preload">
          {leaderGallerySlots.flatMap((slot) => slot.map((leader) => (
            <img
              key={`suspense-${leader.id}`}
              src={spritePath('suspense', leader.id)}
              alt=""
              width={1}
              height={1}
              decoding="async"
            />
          )))}
        </span>
      )}
    </div>
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

function VictoryShow({ party }: { party: Party }) {
  return (
    <div
      className={`victory-show victory-${party.id.toLowerCase()}`}
      style={{
        '--victory-party': party.color,
        '--victory-ink': party.ink,
      } as CSSProperties}
      aria-hidden="true"
    >
      <span className="victory-rays" />
      <span className="victory-starburst">★</span>
      <strong className="victory-headline">Rätt svar!</strong>
      <span className="victory-pose">
        <img src={party.victoryImage} alt="" />
      </span>
      <span className="victory-nameplate">
        <small>Partiledning 2026</small>
        <strong>{party.name}</strong>
        <span>{party.leaders.map((leader) => leader.name).join(' & ')}</span>
      </span>
      <span className="victory-party-token">
        <img className={`party-logo logo-${party.id.toLowerCase()}`} src={party.logo} alt="" />
      </span>
    </div>
  );
}

function QuoteTypography({ quote }: { quote: Quote }) {
  const presentation = quotePresentations[quote.id];
  const segments = segmentQuote(quote.quote, presentation);

  return (
    <>
      <span className="sr-only">{quote.quote}</span>
      {presentation?.visual && (
        <span
          className={`quote-visual visual-${presentation.visual}`}
          aria-hidden="true"
        >
          {quoteVisualGlyphs[presentation.visual]}
        </span>
      )}
      <span className="quote-stage-copy" aria-hidden="true">
        {segments.map((segment, index) => {
          if (segment.kind === 'impact') {
            return (
              <strong className="quote-impact" key={`${segment.kind}-${index}`}>
                {segment.text}
              </strong>
            );
          }
          if (segment.kind === 'soft') {
            return (
              <span className="quote-soft" key={`${segment.kind}-${index}`}>
                {segment.text}
              </span>
            );
          }
          return (
            <span className="quote-plain" key={`${segment.kind}-${index}`}>
              {segment.text}
            </span>
          );
        })}
      </span>
    </>
  );
}

function RevealShowcard({
  quote,
  party,
  chosen,
  correct,
}: {
  quote: Quote;
  party: Party;
  chosen: Party | null;
  correct: boolean;
}) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const verifiedCaricature = quote.speakerCaricature
    && verifiedSpeakerCaricatures.has(quote.speakerCaricature)
    ? quote.speakerCaricature
    : null;
  const verifiedPhoto = quote.speakerImage && quote.verification.speakerIdentity
    ? quote.speakerImage
    : null;
  const portraitSource = [verifiedCaricature, verifiedPhoto].find(
    (source): source is string => Boolean(source && !failedSources.includes(source)),
  );
  const hasVerifiedPortrait = Boolean(portraitSource);
  const hasCaricature = Boolean(
    verifiedCaricature === portraitSource && hasVerifiedPortrait,
  );
  const markPortraitFailed = () => {
    if (!portraitSource) return;
    setFailedSources((sources) =>
      sources.includes(portraitSource) ? sources : [...sources, portraitSource],
    );
  };
  const visualKind = hasCaricature
    ? 'has-caricature'
    : hasVerifiedPortrait
      ? 'has-portrait'
      : 'has-emblem';

  return (
    <div
      className={`reveal-showcard ${visualKind} ${correct ? 'is-correct' : 'is-wrong'}`}
      aria-hidden="true"
    >
      <span className="reveal-rays" />
      <span className="showcard-kicker">Vem var det?</span>
      <span className="reveal-image-frame">
        {hasVerifiedPortrait ? (
          <>
            {hasCaricature && <span className="reveal-character-aura" />}
            {hasCaricature ? (
              <span className="reveal-character-stage">
                <img
                  className="reveal-speaker-image"
                  src={portraitSource ?? ''}
                  alt=""
                  onError={markPortraitFailed}
                />
              </span>
            ) : (
              <img
                className="reveal-speaker-image"
                src={portraitSource ?? ''}
                alt=""
                onError={markPortraitFailed}
              />
            )}
          </>
        ) : (
          <>
            <img className={`reveal-emblem logo-${party.id.toLowerCase()}`} src={party.logo} alt="" />
            <b className="reveal-quote-mark">”</b>
          </>
        )}
        <span className="reveal-party-seal">
          <img className={`party-logo logo-${party.id.toLowerCase()}`} src={party.logo} alt="" />
        </span>
      </span>
      <span className="reveal-speaker-caption">
        <strong>{quote.speaker}</strong>
        <small>{quote.speakerRole}</small>
      </span>
      {!correct && chosen && (
        <span className="wrong-choice-chip">
          <small>Ditt svar</small>
          <img className={`party-logo logo-${chosen.id.toLowerCase()}`} src={chosen.logo} alt="" />
          <b>×</b>
        </span>
      )}
    </div>
  );
}

function QuestionEntryBurst({
  number,
  theme,
  description,
}: {
  number: number;
  theme: string;
  description: string;
}) {
  return (
    <>
      <div className="question-entry-backdrop" aria-hidden="true" />
      <div className="question-entry-burst" aria-hidden="true">
        <span>Fråga {number}</span>
        <strong>{theme}</strong>
        <small>{description}</small>
      </div>
    </>
  );
}

function FeedbackBurst({
  answer,
  streak,
  milestone,
}: {
  answer: Answer;
  streak: number;
  milestone: string | null;
}) {
  const kind = answer.correct ? 'correct' : answer.resolution === 'timeout' ? 'timeout' : 'wrong';
  const { headline, detail } = feedbackCopy(answer, streak);

  return (
    <div className={`feedback-burst is-${kind}`} aria-hidden="true">
      <span className="feedback-symbol">
        {answer.correct ? `+${formatPoints(answer.points.total)}` : '0'}
      </span>
      <strong>{headline}</strong>
      <small>{detail}</small>
      <span className="feedback-breakdown">{scoreBreakdown(answer)}</span>
      {milestone && <em>{milestone}</em>}
    </div>
  );
}

function Confetti({ intensity = 'full' }: { intensity?: 'spark' | 'full' }) {
  const pieces = intensity === 'full' ? confetti : confetti.slice(0, 20);
  return (
    <div className={`confetti-field is-${intensity}`} aria-hidden="true">
      {pieces.map((piece, index) => (
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

function IntroConfetti() {
  return (
    <div className="intro-confetti" aria-hidden="true">
      {introConfetti.map((piece, index) => (
        <i
          className={`is-${piece.shape}`}
          key={index}
          style={{
            '--intro-left': `${piece.left}%`,
            '--intro-sway': `${piece.sway}px`,
            '--intro-delay': `${piece.delay}s`,
            '--intro-duration': `${piece.duration}s`,
            '--intro-rotation': `${piece.rotation}deg`,
            '--intro-size': `${piece.size}px`,
            '--intro-confetti': piece.color,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
