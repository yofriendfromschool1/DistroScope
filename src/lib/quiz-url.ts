// ─────────────────────────────────────────────────────────────
// DistroScope — shareable quiz deep-links
// Encodes/decodes quiz answers into a compact URL-safe string
// so a result can be restored from a link like /?q=<code>#finder
// ─────────────────────────────────────────────────────────────

import { QUIZ_QUESTIONS } from "@/data/questions";
import type { QuizAnswers } from "@/lib/types";

/** Serialize answers -> URL-safe base64 (no padding, +/ replaced). */
export function encodeQuizAnswers(answers: QuizAnswers): string {
  // compact form: question index + option indices keeps links short
  const parts: string[] = [];
  for (let qi = 0; qi < QUIZ_QUESTIONS.length; qi++) {
    const q = QUIZ_QUESTIONS[qi];
    const ids = answers[q.id];
    if (!ids || ids.length === 0) continue;
    const idxs = ids
      .map((id) => q.options.findIndex((o) => o.id === id))
      .filter((i) => i >= 0);
    if (idxs.length === 0) continue;
    parts.push(`${qi}.${idxs.sort((a, b) => a - b).join(",")}`);
  }
  const compact = parts.join(";");
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(compact, "utf8").toString("base64")
      : window.btoa(compact);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a code produced by encodeQuizAnswers. Returns null when invalid. */
export function decodeQuizAnswers(code: string): QuizAnswers | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const compact =
      typeof window === "undefined"
        ? Buffer.from(b64, "base64").toString("utf8")
        : window.atob(b64);
    const answers: QuizAnswers = {};
    for (const part of compact.split(";")) {
      if (!part) continue;
      const [qiRaw, idxRaw] = part.split(".");
      const qi = Number(qiRaw);
      if (!Number.isInteger(qi) || qi < 0 || qi >= QUIZ_QUESTIONS.length)
        return null;
      const q = QUIZ_QUESTIONS[qi];
      const idxs = idxRaw
        .split(",")
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0 && n < q.options.length);
      if (idxs.length === 0) return null;
      answers[q.id] = idxs.map((i) => q.options[i].id);
    }
    return Object.keys(answers).length > 0 ? answers : null;
  } catch {
    return null;
  }
}

/** Build the full shareable URL for a set of answers. */
export function buildShareUrl(answers: QuizAnswers): string {
  const code = encodeQuizAnswers(answers);
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?q=${code}#finder`;
}

/**
 * Sync a set of URL search params with the current compare selection.
 * Keeps other params (e.g. ?q= quiz codes) intact; removes `c` when empty.
 */
export function syncCompareParam(compare: string[]): URLSearchParams {
  const params = new URLSearchParams(window.location.search);
  if (compare.length > 0) {
    params.set("c", compare.join(","));
  } else {
    params.delete("c");
  }
  return params;
}

/** Read + validate a `c=` compare param into distro ids. */
export function readCompareParam(ids: Set<string>): string[] {
  const raw = new URLSearchParams(window.location.search).get("c");
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => ids.has(s))
    .slice(0, 3);
}
