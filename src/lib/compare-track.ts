/**
 * Records "a visitor actually viewed this comparison" events for the
 * community duel arena. Deduped per browser via localStorage (last 40 keys)
 * plus an in-memory session set, so reopening the same pair never
 * double-counts. Fire-and-forget: failures are silently ignored.
 */

const STORAGE_KEY = "distroscope:compares";
const sessionSeen = new Set<string>();

export function recordCompare(ids: string[]): void {
  const unique = Array.from(new Set(ids));
  if (unique.length < 2) return;
  const key = [...unique].sort().join(",");
  if (sessionSeen.has(key)) return;
  sessionSeen.add(key);

  try {
    const seen = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]"
    ) as string[];
    if (Array.isArray(seen) && seen.includes(key)) return;
    const next = (Array.isArray(seen) ? seen : []).concat(key).slice(-40);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage blocked — session set already guards this page view
  }

  void fetch("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: unique }),
  })
    .then((r) => {
      if (r.ok) {
        window.dispatchEvent(new Event("distroscope:compare-recorded"));
      }
    })
    .catch(() => {
      // offline / API down — non-critical
    });
}
