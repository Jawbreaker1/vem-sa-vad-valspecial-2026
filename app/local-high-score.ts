export type LocalHighScore = {
  version: 1;
  format: '12q-wheel';
  scoring: '1000-25s-125streak-v1';
  points: number;
  correct: number;
  questions: 12;
  bestStreak: number;
  blitzCount: number;
  achievedAt: string;
};

const STORAGE_KEY = 'vem-sa-vad:high-score:12q-wheel:v1';

function isSafeCount(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isLocalHighScore(value: unknown): value is LocalHighScore {
  if (!value || typeof value !== 'object') return false;
  const score = value as Partial<LocalHighScore>;
  return score.version === 1
    && score.format === '12q-wheel'
    && score.scoring === '1000-25s-125streak-v1'
    && score.questions === 12
    && isSafeCount(score.points)
    && isSafeCount(score.correct)
    && isSafeCount(score.bestStreak)
    && isSafeCount(score.blitzCount)
    && typeof score.achievedAt === 'string'
    && !Number.isNaN(Date.parse(score.achievedAt));
}

export function readLocalHighScore() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isLocalHighScore(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalHighScore(score: LocalHighScore) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(score));
    return true;
  } catch {
    return false;
  }
}
