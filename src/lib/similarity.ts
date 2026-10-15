import { DISTROS } from "@/data/distros";
import type { Distro, ScoreKey } from "@/lib/types";

/** all 17 trait keys of the score vector */
export const TRAIT_KEYS: ScoreKey[] = [
  "easeOfUse",
  "customizability",
  "performance",
  "outOfBox",
  "stability",
  "freshness",
  "privacyFocus",
  "gamingSupport",
  "devExperience",
  "communitySupport",
  "documentation",
  "macLike",
  "windowsLike",
  "traditionalUI",
  "serverUse",
  "armSupport",
  "nvidiaSupport",
];

/** human-readable labels for all 17 traits */
export const TRAIT_LABELS: Record<ScoreKey, string> = {
  easeOfUse: "Ease of use",
  customizability: "Customizability",
  performance: "Performance",
  outOfBox: "Out-of-box readiness",
  stability: "Stability",
  freshness: "Fresh software",
  privacyFocus: "Privacy",
  gamingSupport: "Gaming support",
  devExperience: "Developer experience",
  communitySupport: "Community support",
  documentation: "Documentation",
  macLike: "macOS familiarity",
  windowsLike: "Windows familiarity",
  traditionalUI: "Classic workflow",
  serverUse: "Server use",
  armSupport: "ARM support",
  nvidiaSupport: "NVIDIA support",
};

/** maximum possible euclidean distance between two 0–100 17-trait vectors */
const MAX_DISTANCE = Math.sqrt(TRAIT_KEYS.length) * 100;

export interface DistroNeighbor {
  distro: Distro;
  /** 0–100, higher = more similar across all 17 traits */
  similarity: number;
}

/**
 * Nearest distros by euclidean distance over the full 17-trait vector.
 * Pure function over the static dataset — safe on client and server.
 */
export function closestDistros(
  distro: Distro,
  count = 3
): DistroNeighbor[] {
  return DISTROS.filter((d) => d.id !== distro.id)
    .map((d) => {
      let sq = 0;
      for (const key of TRAIT_KEYS) {
        const diff = d.scores[key] - distro.scores[key];
        sq += diff * diff;
      }
      const distance = Math.sqrt(sq);
      return {
        distro: d,
        similarity: Math.max(
          1,
          Math.round(100 * (1 - distance / MAX_DISTANCE))
        ),
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, count);
}

/**
 * How alike a quiz-taker profile is to a distro, 0–100.
 * Only the traits the user actually expressed (present in the profile)
 * are compared; neutral traits are skipped so indecision isn't punished.
 */
export function profileSimilarity(
  profile: Partial<Record<ScoreKey, number>>,
  distro: Distro
): number | null {
  const keys = TRAIT_KEYS.filter(
    (key) => typeof profile[key] === "number"
  );
  if (keys.length < 2) return null; // not enough signal
  let sq = 0;
  for (const key of keys) {
    const diff = (profile[key] as number) - distro.scores[key];
    sq += diff * diff;
  }
  const maxD = Math.sqrt(keys.length) * 100;
  const distance = Math.sqrt(sq);
  return Math.max(1, Math.round(100 * (1 - distance / maxD)));
}
