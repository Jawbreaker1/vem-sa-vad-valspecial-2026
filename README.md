# Vem sa vad? ⚡

## Election Special 2026

**Sweden's most overproduced political quiz.** Connect authentic quotes from Swedish politicians to the party behind the words—before the timer, the audience, and the live electrical cable beat you to it.

[**Play Vem sa vad? →**](https://vem-sa-vad-valspecial-2026.jawbreakerz.chatgpt.site/)

> 12 questions · 4 acts · category wheel · local high score · 20 seconds per quote

![The grand Vem sa vad? marquee towers over the Election Special 2026 opening stage](docs/screenshots/startscen.webp)

| Connect the quote | Face the consequences |
| --- | --- |
| ![The sparking cable connects to a party podium](docs/screenshots/kabel-fraga.webp) | ![A correct answer is celebrated with a caricature, spotlights, and confetti](docs/screenshots/ratt-svar.webp) |
| Drag the cable to the party you believe is behind the quote. | A correct answer gets a fanfare. A wrong answer gets the buzzer—and the source is always revealed. |

## More than one political quiz

Vem sa vad? is both a playable game and a proof of concept for a reusable **quote-based gameshow framework**. The political edition is the first fully developed format, but the core loop is deliberately broader:

1. Present a surprising quote without revealing its origin.
2. Let the player connect it to one of several people, characters, groups, or brands.
3. Add time pressure, themed rounds, streaks, spectacle, and immediate feedback.
4. Reveal the answer together with the source, context, and an optional “what happened next?” story.

The same structure could support many different editions:

- **Movie edition** — connect a line to the correct actor, character, or film.
- **Music edition** — connect a lyric or memorable quote to the correct singer, artist, or songwriter.
- **Creator edition** — identify quotes from social-media personalities, streamers, and internet celebrities.
- **Sports edition** — match press-conference quotes and famous one-liners to athletes or coaches.
- **History, science, and business editions** — use the reveal to add context rather than merely announce a correct answer.

The visual identity, contestants, question bank, categories, and reveal content can change while the gameshow machinery remains: dramatic category transitions, timed selection, animated answer targets, scoring, sound, audience reactions, sourced explanations, and a final shareable result.

The long-term idea is a family of content packs built on the same foundation—not a single quiz that happens to contain political quotes.

## How the game works

1. Read the quote and its question theme.
2. Drag the live cable to one of the eight party podiums—or tap a party directly.
3. Answer before the 20-second fuse burns out.
4. Discover who actually said it, when they said it, and in what context.
5. After three questions, an extravagantly overproduced wheel selects the next category.
6. Build streaks, earn time bonuses, beat the local high score, and share the final result.

A game consists of four fast acts with three quotes each. The opening act contains three hand-picked premium quotes; the wheel then selects three different themed rounds. Selection favours the most famous, funny, unexpected, and deceptively phrased quotes while ensuring that all eight parties appear once or twice.

## Six flavours of political circus

- **The Classic** — the quote that stuck.
- **The Gaffe Circus** — politics at its strangest.
- **Well, That Aged…** — the original statement meets what happened next.
- **Party Masquerade** — when the words sound as if they came from a different party.
- **The Duel** — the comeback that landed.
- **Word Picture** — politics painted with very broad strokes.

## The quote bank

The game currently contains **84 quotes**, of which **80 are verified and playable**. Four remain in the editorial review queue and cannot be selected for a game.

The current edition covers 1994–2026. Party leaders, prime ministers, and party spokespersons are prioritised; other official representatives are included only when the wording is unusually strong.

Historical quotes do not necessarily represent a party's position today. The game is not intended to tell players what to think. Its purpose is to challenge assumptions about who sounds like whom—and perhaps expose how readily we accept a statement when it comes from “our” side.

## Sources and verification

A quote becomes playable only after the following have been checked:

- exact wording,
- speaker and official role,
- date and immediate context,
- primary source or original recording,
- precise reference to the speech, timestamp, or section.

After every answer, the game shows the speaker, date, context, and a direct link to the original source. The **Well, That Aged…** theme also requires a separate source supporting the later event. The game never claims that someone “regrets” a statement unless that claim is independently supported.

The complete model is documented in the [editorial workflow](content/EDITORIAL_WORKFLOW.md).

## Run locally

Requires Node.js 22.13 or later.

```bash
npm ci
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Run the complete local quality check with:

```bash
npm run check
```

Checks that retrieve external primary sources are run separately:

```bash
npm run check:quote-links
npm run check:quote-wording
```

## Technology

Next.js 16, React 19, TypeScript, Vinext/Vite, and the Web Audio API. The interface supports mouse, touch, and keyboard input.

## Images, audio, and trademarks

Party logos come from the parties' official press or brand materials and may be protected by trademark law. Stage artwork and caricatures are AI-generated; some identity and source material requires further rights clearance before broad public or commercial use.

Sources and current rights status are documented in [`content/asset-rights.json`](content/asset-rights.json).
