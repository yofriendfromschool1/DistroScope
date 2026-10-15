// ─────────────────────────────────────────────────────────────
// DistroScope — quiz progress persistence (localStorage)
// Saves in-flight quiz state so a reload offers "resume where
// you left off" instead of losing the run.
// ─────────────────────────────────────────────────────────────

import { QUIZ_QUESTIONS } from "@/data/questions";
import type { QuizAnswers } from "@/lib/types";

const KEY = "distroscope:progress";

export interface QuizProgress {
  /** question index the user was on (0-based) */
  index: number;
  /** answers recorded so far (question id → option ids) */
  answers: QuizAnswers;
  /** when the progress was saved (ms epoch) */
  savedAt: number;
}

/** Persist current quiz state. Silently no-ops when storage is unavailable. */
export function saveQuizProgress(index: number, answers: QuizAnswers): void {
  try {
    const payload: QuizProgress = {
      index,
      answers,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // non-critical: private mode / quota / disabled storage
  }
}

/** Load and validate saved progress against the live question set.
 *  Returns null when nothing (usable) is stored. */
export function loadQuizProgress(): QuizProgress | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuizProgress>;
    if (
      typeof parsed.index !== "number" ||
      typeof parsed.answers !== "object" ||
      parsed.answers === null
    ) {
      return null;
    }
    const index = Math.floor(parsed.index);
    if (index < 1 || index >= QUIZ_QUESTIONS.length) return null; // nothing worth resuming

    // keep only known questions + option ids, mirroring API validation
    const answers: QuizAnswers = {};
    for (const q of QUIZ_QUESTIONS) {
      const ids = (parsed.answers as QuizAnswers)[q.id];
      if (!Array.isArray(ids)) continue;
      const valid = ids.filter((id) =>
        q.options.some((o) => o.id === id)
      );
      if (valid.length > 0) {
        answers[q.id] = q.type === "single" ? [valid[0]] : valid.slice(0, 3);
      }
    }
    // progress with zero answers is just an index — not worth resuming
    if (Object.keys(answers).length === 0) return null;

    return { index: Math.min(index, QUIZ_QUESTIONS.length - 1), answers, savedAt: Date.now() };
  } catch {
    return null;
  }
}

/** Drop saved progress (quiz finished, retake, or explicit fresh start). */
export function clearQuizProgress(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // non-critical
  }
}
