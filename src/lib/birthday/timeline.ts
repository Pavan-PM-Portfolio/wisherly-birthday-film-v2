import type { BeatId, StoryBeat } from "./types";

/* ─────────────────────────────────────────────────────────────────────────────
   ONE master timeline.

   The film is 30.0 s. Its beats were mapped by stepping through the merged
   video frame by frame (see README → "Timing map"). Scroll does not map to time
   linearly: each beat gets scroll room in proportion to how much there is to
   do in it, and the film slows down (never freezes) while an interaction is
   available. Everything else on the page reads the same `videoTime`.
   ───────────────────────────────────────────────────────────────────────────── */

export const VIDEO_DURATION = 30.0;

/** The story, in film seconds. Edit these if the film is re-cut. */
export const story: StoryBeat[] = [
  { id: "hero", label: "Hello", start: 0, end: 2.0, interact: [0.3, 2.0] },
  { id: "cake", label: "Make a wish", start: 2.0, end: 5.0, interact: [2.4, 5.0], gate: { at: 3.271, hint: "Make a wish to continue" } },
  { id: "wishes", label: "Wishes", start: 5.0, end: 12.5, interact: [10.0, 12.5], gate: { at: 11.188, hint: "Open your wishes to continue" } },
  { id: "photos", label: "Photos", start: 12.5, end: 17.0, interact: [13.8, 17.0], gate: { at: 14.771, hint: "Click the camera to continue" } },
  { id: "message", label: "A message", start: 17.0, end: 20.5, interact: [18.6, 20.5], gate: { at: 20.188, hint: "Read your message", announce: true } },
  { id: "memories", label: "Memories", start: 20.5, end: 24.875, interact: [22.6, 24.875] },
  { id: "gift", label: "The gift", start: 24.875, end: VIDEO_DURATION, interact: [26.2, VIDEO_DURATION], gate: { at: 27.146, hint: "Open the gift" } },
];

/*
 * Gates (the `gate` field above) sit on exact frames, the same in both films
 * (they share timing and cuts at 10.0 s, 20.0 s and 24.875 s): leaning over the
 * lit candles (frame 78), reading the card (268), camera at her eye (354), the
 * laptop's blank screen in close-up (484, a few frames after the cut), hands on
 * the gift just before it glows (651). Times are frame centres: (frame + 0.5) / 24.
 */

/**
 * Scroll pacing: [scroll units, film seconds]. One unit = one screen of scrolling.
 * Steep stretches are her walking between moments; shallow stretches are where
 * the visitor is invited to do something.
 */
export const PACING: [number, number][] = [
  [0, 0],
  [1.0, 2.0], //   hero: walks in
  [2.4, 4.2], //   leans over the candles (slow)
  [3.0, 5.0], //   steps back
  [4.4, 10.0], //  walks to the card table, picks a card
  [5.8, 12.2], //  reads it (slow)
  [6.3, 13.8], //  walks to the camera
  [7.8, 15.5], //  takes the picture (slow)
  [8.4, 18.0], //  walks to the desk
  [9.6, 20.5], //  the laptop, the blank screen (slow)
  [10.2, 22.6], // turns to the photo wall
  [11.4, 24.875], // memories (slow)
  [12.0, 26.2], // reaches the gift
  [13.8, VIDEO_DURATION - 0.05], // opens it
];

export const SCROLL_UNITS = PACING[PACING.length - 1][0];

/** Scroll progress (0..1) → film seconds. */
export function progressToTime(p: number): number {
  const u = Math.max(0, Math.min(1, p)) * SCROLL_UNITS;
  for (let i = 1; i < PACING.length; i++) {
    const [u1, t1] = PACING[i];
    if (u <= u1) {
      const [u0, t0] = PACING[i - 1];
      return t0 + ((u - u0) / (u1 - u0)) * (t1 - t0);
    }
  }
  return PACING[PACING.length - 1][1];
}

/** Film seconds → scroll progress (0..1). Used by the journey indicator. */
export function timeToProgress(t: number): number {
  for (let i = 1; i < PACING.length; i++) {
    const [u1, t1] = PACING[i];
    if (t <= t1) {
      const [u0, t0] = PACING[i - 1];
      return (u0 + ((t - t0) / (t1 - t0)) * (u1 - u0)) / SCROLL_UNITS;
    }
  }
  return 1;
}

/** The normalized start/end of each beat on the scroll (0..1), derived from the film times. */
export const storyProgress = story.map((b) => ({ id: b.id, start: timeToProgress(b.start), end: b.end >= VIDEO_DURATION ? 1 : timeToProgress(b.end) }));

export function beatAt(t: number): BeatId {
  for (const b of story) if (t < b.end) return b.id;
  return "gift";
}

export const beat = (id: BeatId) => story.find((b) => b.id === id)!;

/** 0 → 1 → 0 window with soft edges, for reveals that start slightly before and end slightly after a moment. */
export function windowed(t: number, a: number, b: number, fadeIn = 0.4, fadeOut = 0.4): number {
  const up = clamp01((t - a) / fadeIn);
  const down = clamp01((b - t) / fadeOut);
  return ease(Math.min(up, down));
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const ease = (x: number) => x * x * (3 - 2 * x);
