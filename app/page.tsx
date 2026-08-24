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
import { PartyId, Quote, quotePriority, quotes } from './quotes';

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
  chosen: PartyId | null;
  correct: boolean;
};

type Point = { x: number; y: number };
type Screen = 'intro' | 'question' | 'results';
type Phase = 'choosing' | 'reveal';
type Cue = 'start' | 'grab' | 'connect' | 'tick' | 'timeout' | 'correct' | 'wrong';
type CrowdCue = 'cheer' | 'boo' | 'laugh';
type MusicCue = 'intro' | 'game';
type CableHum = {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
};

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

const QUESTION_SECONDS = 20;
const QUESTIONS_PER_PARTY = 3;
const MUSIC_VOLUMES: Record<MusicCue, number> = { intro: .15, game: .12 };

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

function weightedSample(items: Quote[], count: number) {
  const pool = [...items];
  const selected: Quote[] = [];

  while (pool.length && selected.length < count) {
    const weights = pool.map((quote) => Math.max(1, quotePriority(quote) - 50) ** 2);
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

function buildRound(bank: Quote[]) {
  const balanced = parties.flatMap((party) => {
    const candidates = bank.filter(
      (quote) => quote.party === party.id && quote.reviewStatus === 'approved',
    );
    return weightedSample(candidates, QUESTIONS_PER_PARTY);
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
  const [musicReady, setMusicReady] = useState(false);
  const [musicAttempted, setMusicAttempted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [timedOut, setTimedOut] = useState(false);
  const [autoLocked, setAutoLocked] = useState(false);
  const [geometry, setGeometry] = useState<{
    start: Point;
    targets: Partial<Record<PartyId, Point>>;
  } | null>(null);
  const jackRef = useRef<HTMLSpanElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const sfxMasterRef = useRef<GainNode | null>(null);
  const crowdAudioRef = useRef<Partial<Record<CrowdCue, HTMLAudioElement>>>({});
  const activeCrowdRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<Partial<Record<MusicCue, HTMLAudioElement>>>({});
  const musicReadyRef = useRef(false);
  const musicAttemptedRef = useRef(false);
  const musicRequestRef = useRef(0);
  const cableHumRef = useRef<CableHum | null>(null);
  const selectedRef = useRef<PartyId | null>(null);
  const resolvedRef = useRef(false);
  const timeoutActionRef = useRef<() => void>(() => undefined);
  const tickActionRef = useRef<(secondsRemaining: number) => void>(() => undefined);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const current = roundQuotes[currentIndex] ?? quotes[0];
  const correctParty = partyById(current.party);
  const selectedParty = selected ? partyById(selected) : null;
  const wasCorrect = !timedOut && selected === current.party;
  const score = answers.filter((answer) => answer.correct).length;
  const timerRatio = Math.max(0, Math.min(1, timeLeft / QUESTION_SECONDS));
  const timerScale = 1 + Math.max(0, 7 - timeLeft) * .045;
  const needsMusicUnlock = soundOn && !musicReady && !musicAttempted;

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

  useEffect(() => {
    const cheer = new Audio('/sounds/crowd-cheer.mp3');
    const boo = new Audio('/sounds/crowd-boo.mp3');
    const laugh = new Audio('/sounds/crowd-laugh.mp3');
    const introMusic = new Audio('/music/intro-show.mp3');
    const gameMusic = new Audio('/music/question-tension.mp3');
    cheer.preload = 'auto';
    boo.preload = 'auto';
    laugh.preload = 'auto';
    cheer.volume = .88;
    boo.volume = .92;
    laugh.volume = .92;
    introMusic.preload = 'auto';
    gameMusic.preload = 'auto';
    introMusic.loop = true;
    gameMusic.loop = true;
    introMusic.volume = MUSIC_VOLUMES.intro;
    gameMusic.volume = MUSIC_VOLUMES.game;
    crowdAudioRef.current = { cheer, boo, laugh };
    musicAudioRef.current = { intro: introMusic, game: gameMusic };

    return () => {
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
      const context = audioRef.current;
      audioRef.current = null;
      sfxMasterRef.current = null;
      if (context && context.state !== 'closed') void context.close();
    };
  }, []);

  useEffect(() => {
    timeoutActionRef.current = handleQuestionExpired;
    tickActionRef.current = (secondsRemaining) => playCue('tick', false, secondsRemaining);
  });

  useEffect(() => {
    if (screen !== 'question' || phase !== 'choosing') return;
    const deadline = performance.now() + QUESTION_SECONDS * 1000;
    let lastSecond = QUESTION_SECONDS;
    const timer = window.setInterval(() => {
      if (resolvedRef.current) {
        window.clearInterval(timer);
        return;
      }
      const next = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
      if (next === lastSecond) return;
      lastSecond = next;
      setTimeLeft(next);
      if (next > 0 && next <= 7) tickActionRef.current(next);
      if (next === 0) {
        window.clearInterval(timer);
        timeoutActionRef.current();
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [screen, phase, currentIndex]);

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
    if (!audioRef.current) {
      audioRef.current = new AudioContext();
      const master = audioRef.current.createGain();
      master.gain.value = soundOn ? 1 : .0001;
      master.connect(audioRef.current.destination);
      sfxMasterRef.current = master;
    }
    if (audioRef.current.state === 'suspended') {
      void audioRef.current.resume().catch(() => {
        musicReadyRef.current = false;
        musicAttemptedRef.current = false;
        setMusicReady(false);
        setMusicAttempted(false);
      });
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

  function playCue(cue: Cue, force = false, secondsRemaining = timeLeft) {
    if (!soundOn && !force) return;
    const audio = ensureAudio();
    if (!audio) return;
    const now = audio.currentTime;
    const destination = sfxMasterRef.current ?? audio.destination;

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

    if (cue === 'tick') {
      const urgent = secondsRemaining <= 4;
      note(urgent ? 1180 : 880, 0, urgent ? .14 : .1, 'square', urgent ? .045 : .026);
      note(urgent ? 720 : 560, .045, urgent ? .12 : .09, 'triangle', urgent ? .032 : .018);
    }

    if (cue === 'timeout') {
      [196, 147, 110].forEach((frequency, index) => note(frequency, index * .17, .34, 'sawtooth', .075));
      crackle(.02, .48, .045);
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
    if (!soundOn) return;
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
      track.onended = null;
    };
    void track.play().catch(() => {
      if (activeCrowdRef.current === track) activeCrowdRef.current = null;
      restoreMusicVolume();
      track.onended = null;
    });
  }

  function pauseMusic(reset = false) {
    musicRequestRef.current += 1;
    Object.values(musicAudioRef.current).forEach((track) => {
      track?.pause();
      if (track && reset) track.currentTime = 0;
    });
  }

  function switchMusic(cue: MusicCue, force = false) {
    if (!soundOn && !force) return;
    const desired = musicAudioRef.current[cue];
    if (!desired) return;
    const request = ++musicRequestRef.current;
    musicAttemptedRef.current = true;
    setMusicAttempted(true);

    Object.entries(musicAudioRef.current).forEach(([key, track]) => {
      if (key === cue || !track) return;
      track.pause();
      track.currentTime = 0;
    });
    desired.volume = MUSIC_VOLUMES[cue];

    void desired.play().then(() => {
      if (request !== musicRequestRef.current) return;
      musicReadyRef.current = true;
      setMusicReady(true);
    }).catch(() => {
      if (request !== musicRequestRef.current) return;
      musicReadyRef.current = false;
      setMusicReady(false);
    });
  }

  function toggleSound() {
    if (soundOn && !musicReadyRef.current && !musicAttemptedRef.current) {
      primeCrowdAudio();
      setSynthSound(true);
      switchMusic(screen === 'question' ? 'game' : 'intro', true);
      playCue('connect', true);
      return;
    }

    if (soundOn) {
      stopCrowd();
      stopCableHum();
      setSynthSound(false);
      pauseMusic();
      setSoundOn(false);
      return;
    }

    setSoundOn(true);
    primeCrowdAudio();
    setSynthSound(true);
    playCue('connect', true);
    switchMusic(screen === 'question' ? 'game' : 'intro', true);
  }

  function startGame() {
    stopCrowd();
    stopCableHum();
    primeCrowdAudio();
    resolvedRef.current = false;
    selectedRef.current = null;
    setRoundQuotes(buildRound(quotes));
    setAnswers([]);
    setCurrentIndex(0);
    setSelected(null);
    setPointer(null);
    setDragging(false);
    setPhase('choosing');
    setTimedOut(false);
    setAutoLocked(false);
    setTimeLeft(QUESTION_SECONDS);
    setScreen('question');
    playCue('start');
    switchMusic('game');
  }

  function connectParty(party: PartyId) {
    if (phase !== 'choosing' || resolvedRef.current) return;
    selectedRef.current = party;
    setSelected(party);
    setPointer(null);
    setDragging(false);
    playCue('connect');
  }

  function revealChoice(choice: PartyId, lockedByTimer = false) {
    if (phase !== 'choosing' || resolvedRef.current) return;
    resolvedRef.current = true;
    stopCableHum();
    const correct = choice === current.party;
    setAnswers((previous) => [
      ...previous,
      { quoteId: current.id, party: current.party, chosen: choice, correct },
    ]);
    setSelected(choice);
    setTimedOut(false);
    setAutoLocked(lockedByTimer);
    setPhase('reveal');
    playCue(correct ? 'correct' : 'wrong');
    playCrowd(correct ? 'cheer' : 'boo');
  }

  function submitAnswer() {
    const choice = selectedRef.current;
    if (!choice) return;
    revealChoice(choice);
  }

  function handleQuestionExpired() {
    if (phase !== 'choosing' || resolvedRef.current) return;
    stopCableHum();
    setDragging(false);
    setPointer(null);

    const choice = selectedRef.current;
    if (choice) {
      revealChoice(choice, true);
      return;
    }

    resolvedRef.current = true;
    setAnswers((previous) => [
      ...previous,
      { quoteId: current.id, party: current.party, chosen: null, correct: false },
    ]);
    setTimedOut(true);
    setAutoLocked(false);
    setPhase('reveal');
    playCue('timeout');
    playCrowd('laugh');
  }

  function startCable(event: PointerEvent<HTMLSpanElement>) {
    if (phase !== 'choosing' || resolvedRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    playCue('grab');
    startCableHum();
    selectedRef.current = null;
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
    stopCableHum();
    if (hit?.dataset.party) connectParty(hit.dataset.party as PartyId);
  }

  function cancelCable() {
    stopCableHum();
    setDragging(false);
    setPointer(null);
  }

  function nextQuestion() {
    stopCrowd();
    stopCableHum();
    if (currentIndex === roundQuotes.length - 1) {
      setScreen('results');
      switchMusic('intro');
      return;
    }
    resolvedRef.current = false;
    selectedRef.current = null;
    setCurrentIndex((index) => index + 1);
    setSelected(null);
    setPointer(null);
    setDragging(false);
    setPhase('choosing');
    setTimedOut(false);
    setAutoLocked(false);
    setTimeLeft(QUESTION_SECONDS);
    playCue('connect');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function returnHome() {
    stopCrowd();
    stopCableHum();
    resolvedRef.current = false;
    selectedRef.current = null;
    setScreen('intro');
    setPhase('choosing');
    setSelected(null);
    setPointer(null);
    setDragging(false);
    setTimedOut(false);
    setAutoLocked(false);
    setTimeLeft(QUESTION_SECONDS);
    switchMusic('intro');
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
        <div className="intro-image" aria-hidden="true" />
        <div className="sweep sweep-one" aria-hidden="true" />
        <div className="sweep sweep-two" aria-hidden="true" />
        <section className="intro-console" aria-labelledby="intro-title">
          <h1 className="intro-logo" id="intro-title">
            <span className="intro-crown" aria-hidden="true">
              <i>★</i>
              <i>★</i>
              <i>★</i>
            </span>
            <span className="intro-logo-main">
              <span className="intro-title-text">Vem sa vad?</span>
            </span>
            <span className="intro-logo-edition">
              <i aria-hidden="true">★</i>
              Valspecial 2026
              <i aria-hidden="true">★</i>
            </span>
          </h1>
          <button className="start-button" onClick={startGame} aria-describedby="intro-note">
            <span>Starta spelet</span>
            <small>Koppla citaten till rätt parti</small>
          </button>
          <div className="intro-kicker">
            8 partier · {quotes.filter((quote) => quote.reviewStatus === 'approved').length} verifierade citat · 0 säkra kort
          </div>
        </section>
        <p className="intro-note" id="intro-note">
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
        {soundButton}
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
          ? `${timedOut ? 'Tiden är ute utan något val.' : autoLocked ? `Tiden är ute och valet ${selectedParty?.name} låstes automatiskt. ${wasCorrect ? 'Rätt svar.' : 'Fel svar.'}` : wasCorrect ? 'Rätt svar.' : `Fel svar. Du valde ${selectedParty?.name}.`} Rätt parti är ${correctParty.name}. Citatet sades av ${current.speaker} år ${current.date.slice(0, 4)}.`
          : selectedParty
            ? `${selectedParty.name} är inkopplat. Tryck på Svara när du är redo.`
            : ''}
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {phase === 'choosing' && (timeLeft === 7 || timeLeft === 3) ? `${timeLeft} sekunder kvar.` : ''}
      </p>

      <header className="game-header">
        <button className="mini-brand" onClick={returnHome}>
          Vem sa vad?
        </button>
        <div className="header-center">
          <div className="progress-pill">
            Fråga {currentIndex + 1} av {roundQuotes.length}
            <span className="score-inline">{score} rätt</span>
          </div>
          <div
            className={[
              'timer-console',
              timeLeft <= 7 ? 'is-warning' : '',
              timeLeft <= 4 ? 'is-danger' : '',
              phase === 'reveal' ? 'is-stopped' : '',
              timedOut ? 'is-timeout' : '',
            ].filter(Boolean).join(' ')}
            style={{
              '--fuse': `${timerRatio * 100}%`,
              '--timer-scale': timerScale,
            } as CSSProperties}
            role="timer"
            aria-label={phase === 'reveal' ? `Tiden stannade på ${timeLeft} sekunder` : `${timeLeft} sekunder kvar`}
          >
            <span className="timer-number" aria-hidden="true">
              <strong><i key={timeLeft}>{timeLeft}</i></strong>
              <small>sek</small>
            </span>
            <span className="timer-fuse" aria-hidden="true">
              <span className="fuse-track">
                <span className="fuse-remaining">
                  <i className="fuse-flame" />
                </span>
              </span>
              <b>{phase === 'reveal' ? 'STOPP' : 'TID KVAR'}</b>
            </span>
          </div>
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
              {timedOut ? 'Tiden är ute!' : autoLocked ? 'Tiden låste valet!' : wasCorrect ? 'Rätt svar!' : 'Inte riktigt!'}
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
            <span className="jack-grip" />
            <span className="jack-sparks" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
            </span>
            <span className="drag-callout" aria-hidden="true">
              <i>←</i>
              <b>Klicka &amp; dra</b>
            </span>
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
                  Svara
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
              <span>{timedOut ? 'Publiken hann före dig!' : autoLocked ? (wasCorrect ? 'Precis på håret!' : 'Valet låstes på noll!') : wasCorrect ? 'Du satte den!' : `Du valde ${selectedParty?.name}`}</span>
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
            <path className="cable-aura" d={cable.path} />
            <path className="cable-shadow" d={cable.path} />
            <path className="cable-core" d={cable.path} />
            <path className="cable-hotline" d={cable.path} pathLength="100" />
            <path className="cable-current cable-current-gold" d={cable.path} pathLength="100" />
            <path className="cable-current cable-current-blue" d={cable.path} pathLength="100" />
            <path className="cable-charge charge-one" d={cable.path} pathLength="100" />
            <path className="cable-charge charge-two" d={cable.path} pathLength="100" />
            <path className="cable-charge charge-three" d={cable.path} pathLength="100" />
            {(dragging || selected) && (
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
