// ─────────────────────────────────────────────────────────────
// DistroScope — tiny fuzzy matcher for the command palette.
// Subsequence scoring with bonuses for word starts and runs of
// consecutive characters, plus a DENSITY gate so scattered
// matches across long taglines get cut — enough to make "lmint"
// find "Linux Mint" without pulling in a fuzzy-search dependency.
// ─────────────────────────────────────────────────────────────

/** Chars of the query that must appear (spaces act as wildcards). */
function queryChars(q: string): number {
  return q.replace(/\s/g, "").length;
}

/**
 * Score `text` against `query` (both case-insensitive).
 * Returns a positive number for a match (higher = better), 0 for none.
 *
 *  - Every query char must appear in order (subsequence rule).
 *  - Consecutive-char runs and word-start hits score higher, so
 *    exact prefixes beat scattered subsequences.
 *  - The match must stay reasonably DENSE: query chars spread over
 *    a huge span (e.g. across a whole tagline) are rejected.
 */
export function fuzzyScore(text: string, query: string): number {
  if (!query) return 1; // empty query matches everything, neutrally
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  const qc = queryChars(q);
  if (qc === 0) return 1;

  let score = 0;
  let ti = 0;
  let run = 0; // length of the current consecutive streak
  let firstPos = -1;
  let lastPos = -1;

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    if (ch === " ") {
      run = 0;
      continue; // treat spaces as wildcards between tokens
    }
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0; // subsequence rule broken

    const isWordStart = found === 0 || /[\s\-_/]/.test(t[found - 1]);
    score += 10; // base hit
    if (found === ti && qi > 0 && q[qi - 1] !== " ") {
      run += 1;
      score += 8 * run; // consecutive bonus grows with streak
    } else {
      run = 0;
    }
    if (isWordStart) score += 6;
    if (firstPos === -1) firstPos = found;
    lastPos = found;
    ti = found + 1;
  }

  // density gate: query chars crammed into a tight span score well;
  // the same chars scattered across a tagline get rejected outright.
  const span = lastPos - firstPos + 1;
  const density = qc / span;
  if (density < 0.25) return 0;
  score *= 0.5 + Math.min(1, density); // tighter matches rank higher

  // reward short texts slightly — "arch" beats "arch linux docs" ties
  score += Math.max(0, 8 - (t.length - q.length) * 0.05);

  // strong bonus when the query is a straight prefix of the text
  if (t.startsWith(q)) score += 24;

  return score;
}
