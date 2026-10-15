// ─────────────────────────────────────────────────────────────
// DistroScope — matching engine
// Pure functions: quiz answers in, ranked distro matches out.
// ─────────────────────────────────────────────────────────────

import { DISTROS } from "@/data/distros";
import { QUIZ_QUESTIONS } from "@/data/questions";
import type {
  Distro,
  DistroMatch,
  MatchReason,
  MatchResult,
  QuizAnswers,
  QuizOption,
  ScoreKey,
} from "@/lib/types";

const REASON_TEMPLATES: Record<ScoreKey, MatchReason> = {
  easeOfUse: {
    title: "Gentle learning curve",
    detail:
      "One of the friendliest Linux starts you can pick — it matches how new you are to this.",
  },
  customizability: {
    title: "Yours to reshape",
    detail:
      "Deeply tweakable at every level, so you can build exactly the system you described.",
  },
  performance: {
    title: "Featherweight on hardware",
    detail:
      "Sips RAM and CPU, which is exactly what your device needs to feel snappy again.",
  },
  outOfBox: {
    title: "Works out of the box",
    detail:
      "Codecs, drivers, and everyday apps arrive preinstalled — no scavenging after install.",
  },
  stability: {
    title: "Rock solid",
    detail:
      "Famously predictable and stable, so unpleasant surprises stay rare.",
  },
  freshness: {
    title: "Fresh software, fast",
    detail:
      "Ships the newest kernels and app versions quickly — the up-to-date experience you asked for.",
  },
  privacyFocus: {
    title: "Privacy-first design",
    detail:
      "Collects nothing and respects your data, in line with your privacy priorities.",
  },
  gamingSupport: {
    title: "Gaming ready",
    detail:
      "Drivers, kernels, and gaming tools come preconfigured — your games should just run.",
  },
  devExperience: {
    title: "A developer's playground",
    detail:
      "The tooling, package selection, and freshness you want for serious development work.",
  },
  communitySupport: {
    title: "Help is everywhere",
    detail:
      "A huge community means your question was probably answered years ago.",
  },
  documentation: {
    title: "Documentation you can trust",
    detail:
      "Excellent manuals and guides for whenever you want to dig deeper on your own.",
  },
  macLike: {
    title: "macOS feels at home",
    detail:
      "Its interface, dock, and polish will feel familiar the moment you log in.",
  },
  windowsLike: {
    title: "Windows-like comfort",
    detail:
      "The layout and workflows map closely to Windows, cutting the switching cost.",
  },
  traditionalUI: {
    title: "Classic desktop workflow",
    detail:
      "Panels, menus, and a predictable layout — desktop computing the classic way.",
  },
  serverUse: {
    title: "Built for serving",
    detail:
      "A proven host for services and self-hosting with long support horizons.",
  },
  armSupport: {
    title: "ARM native",
    detail:
      "First-class support for ARM boards like the one you're setting up.",
  },
  nvidiaSupport: {
    title: "NVIDIA without the drama",
    detail:
      "Handles NVIDIA drivers gracefully, which spares you the classic rite of passage.",
  },
};

const FALLBACK_REASON: MatchReason = {
  title: "Crowd favorite",
  detail:
    "Loved by a big community, so guides, fixes, and forum answers are easy to find.",
};

// ── Init-system reasons (not tied to a score key) ────────────

const INIT_REASONS = {
  systemdFreeHard: {
    title: "systemd-free, guaranteed",
    detail:
      "Boots a classic init like OpenRC, runit or SysVinit as PID 1 — exactly the systemd-free system you insisted on.",
  },
  systemdFreeSoft: {
    title: "No systemd under the hood",
    detail:
      "Runs an alternative init (OpenRC, runit, SysVinit…), matching your preference to steer clear of systemd.",
  },
  systemdMainstream: {
    title: "Mainstream systemd base",
    detail:
      "Ships standard systemd, so every modern tutorial, service and tool works out of the box.",
  },
} as const;

// ── Governance + AI-posture reasons ──────────────────────────

const GOVERNANCE_REASONS = {
  community: {
    title: "Community-governed project",
    detail:
      "Steered by contributors, votes and rough consensus — the assembly-driven model you asked for.",
  },
  corporate: {
    title: "Corporate-backed muscle",
    detail:
      "A company stands behind it with a roadmap, engineers and accountability — exactly the backing you wanted.",
  },
  independent: {
    title: "Small independent team",
    detail:
      "Built by a small crew with a single vision and zero committees — the indie spirit you picked.",
  },
} as const;

const AI_REASONS = {
  reviewed: {
    title: "Human-reviewed contributions",
    detail:
      "The project holds humans accountable for what lands in its repos — AI-assisted work must be disclosed and signed off, matching your provenance preference.",
  },
  embracing: {
    title: "AI-forward project",
    detail:
      "Actively ships and promotes AI tooling and ML stacks, which you count as a plus rather than a red flag.",
  },
} as const;

/** Flat raw-score bonus when a soft init preference matches. */
const INIT_PREFER_BONUS = 3.2;
/** Flat raw-score bonuses for governance / AI-posture soft preferences. */
const GOVERNANCE_PREFER_BONUS = 2.6;
const AI_PREFER_BONUS = 2.2;
/** Raw-score penalty per violated hard requirement in relaxed fallback mode. */
const HARD_VIOLATION_PENALTY = 9;

interface Selected {
  question: string;
  option: QuizOption;
}

function collectSelections(answers: QuizAnswers): Selected[] {
  const selected: Selected[] = [];
  for (const question of QUIZ_QUESTIONS) {
    const ids = answers[question.id] ?? [];
    for (const id of ids) {
      const option = question.options.find((o) => o.id === id);
      if (option) selected.push({ question: question.id, option });
    }
  }
  return selected;
}

/** Which of this option's hard requirements does the distro violate? */
function hardViolations(distro: Distro, option: QuizOption): string[] {
  const hard = option.hardRequirements;
  if (!hard) return [];
  const violated: string[] = [];
  if (hard.needsArm && distro.scores.armSupport < 50)
    violated.push("ARM board support");
  if (hard.maxRam !== undefined && distro.ramMin > hard.maxRam)
    violated.push(
      `needs ${distro.ramMin >= 1024 ? `${Math.round(distro.ramMin / 1024)} GB` : `${distro.ramMin} MB`} RAM`
    );
  if (
    hard.initSystems &&
    hard.initSystems.length > 0 &&
    !hard.initSystems.includes(distro.initSystem)
  )
    violated.push("systemd init");
  if (hard.tags && hard.tags.length > 0) {
    const hasTag = distro.useCases.some((t) => hard.tags!.includes(t));
    if (!hasTag) {
      if (hard.tags.includes("immutable")) violated.push("traditional (mutable) base");
      else if (hard.tags.includes("free-software")) violated.push("ships proprietary bits");
      else violated.push(hard.tags.join(" / "));
    }
  }
  return violated;
}

function satisfiesHardRequirements(distro: Distro, selected: Selected[]): boolean {
  for (const { option } of selected) {
    if (hardViolations(distro, option).length > 0) return false;
  }
  return true;
}

function buildReasons(
  distro: Distro,
  contributions: Partial<Record<ScoreKey, number>>,
  extras: MatchReason[]
): MatchReason[] {
  const ranked = (Object.entries(contributions) as [ScoreKey, number][])
    .filter(([key, value]) => value > 0.3 && distro.scores[key] >= 50)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => REASON_TEMPLATES[key]);

  const pool = [...extras, ...ranked];
  if (pool.length >= 2) return pool.slice(0, 3);

  const fallbacks: MatchReason[] = [];
  if (
    pool.length === 0 ||
    (pool.length === 1 && extras.length === 0 && ranked.length === 0)
  ) {
    fallbacks.push(FALLBACK_REASON);
  }
  // add the distro's absolute best traits as extra context
  const best = (Object.entries(distro.scores) as [ScoreKey, number][])
    .sort((a, b) => b[1] - a[1])
    .filter(
      ([key]) =>
        !ranked.some((r) => r.title === REASON_TEMPLATES[key].title) &&
        !extras.some((r) => r.title === REASON_TEMPLATES[key]?.title)
    )
    .slice(0, Math.max(0, 3 - pool.length - fallbacks.length))
    .map(([key]) => REASON_TEMPLATES[key]);

  return [...pool, ...fallbacks, ...best].slice(0, 3);
}

interface ScoredCandidate {
  distro: Distro;
  raw: number;
  contributions: Partial<Record<ScoreKey, number>>;
  extras: MatchReason[];
  compromises: string[];
}

function scoreCandidate(
  distro: Distro,
  selected: Selected[],
  relaxed: boolean
): ScoredCandidate {
  const contributions: Partial<Record<ScoreKey, number>> = {};
  let raw = 0;
  const extras: MatchReason[] = [];
  const compromises: string[] = [];
  for (const { option } of selected) {
    for (const [key, weight] of Object.entries(
      option.weights
    ) as [ScoreKey, number][]) {
      const contribution = weight * (distro.scores[key] / 100);
      raw += contribution;
      contributions[key] = (contributions[key] ?? 0) + contribution;
    }
    // init-system handling: hard match reason + soft preference bonus
    const hard = option.hardRequirements?.initSystems;
    if (hard && !hard.includes("systemd")) {
      if (
        !extras.some((r) => r.title === INIT_REASONS.systemdFreeHard.title)
      )
        extras.push(INIT_REASONS.systemdFreeHard);
    }
    if (option.preferInit === "non-systemd") {
      if (distro.initSystem !== "systemd") {
        raw += INIT_PREFER_BONUS;
        if (
          !extras.some((r) => r.title === INIT_REASONS.systemdFreeSoft.title)
        )
          extras.push(INIT_REASONS.systemdFreeSoft);
      }
    } else if (option.preferInit === "systemd") {
      if (distro.initSystem === "systemd") {
        raw += INIT_PREFER_BONUS * 0.5;
        if (
          !extras.some(
            (r) => r.title === INIT_REASONS.systemdMainstream.title
          )
        )
          extras.push(INIT_REASONS.systemdMainstream);
      }
    }
    // governance soft preference
    if (
      option.preferGovernance &&
      distro.governance === option.preferGovernance
    ) {
      raw += GOVERNANCE_PREFER_BONUS;
      const reason = GOVERNANCE_REASONS[option.preferGovernance];
      if (!extras.some((r) => r.title === reason.title)) extras.push(reason);
    }
    // AI-posture soft preference
    if (option.preferAi && distro.aiPolicy === option.preferAi) {
      raw += AI_PREFER_BONUS;
      const reason = AI_REASONS[option.preferAi];
      if (reason && !extras.some((r) => r.title === reason.title))
        extras.push(reason);
    }
    // relaxed fallback mode: collect violated hard requirements as
    // compromises and penalize them instead of filtering the distro out
    if (relaxed) {
      for (const violation of hardViolations(distro, option)) {
        if (!compromises.includes(violation)) compromises.push(violation);
      }
    }
  }
  if (relaxed && compromises.length > 0) {
    raw -= HARD_VIOLATION_PENALTY * compromises.length;
  }
  return { distro, raw, contributions, extras, compromises };
}

/**
 * Full match result: strict pass first; if the hard requirements eliminated
 * every distro (e.g. "2 GB RAM" + "immutable" + "FSF-endorsed"), the engine
 * retries with those requirements downgraded to scored penalties and marks
 * the result as relaxed — the UI can then surface the compromises.
 */
export function computeMatchResult(
  answers: QuizAnswers,
  limit = 6
): MatchResult {
  const selected = collectSelections(answers);

  let relaxed = false;
  let pool = DISTROS.filter((d) => satisfiesHardRequirements(d, selected));
  if (pool.length === 0) {
    relaxed = true;
    pool = DISTROS;
  }

  const scored = pool
    .map((distro) => scoreCandidate(distro, selected, relaxed))
    .sort((a, b) => b.raw - a.raw);

  if (scored.length === 0) return { matches: [], relaxed };

  const best = Math.max(scored[0].raw, 1);

  const matches = scored.slice(0, limit).map(
    ({ distro, raw, contributions, extras, compromises }) => {
      const ratio = best > 0 ? Math.max(0, raw / best) : 0.5;
      const score = Math.round(Math.min(99, Math.max(28, 40 + 59 * ratio)));
      const match: DistroMatch = {
        distro,
        score,
        reasons: buildReasons(distro, contributions, extras),
      };
      if (relaxed && compromises.length > 0) match.compromises = compromises;
      return match;
    }
  );
  return { matches, relaxed };
}

/** Backwards-compatible wrapper: ranked matches only. */
export function computeMatches(answers: QuizAnswers, limit = 6): DistroMatch[] {
  return computeMatchResult(answers, limit).matches;
}

// ── User trait profile ────────────────────────────────────────

/**
 * Per trait, the largest net weight a user could accumulate across all
 * questions: positives are capped by the quiz's selection limits
 * (single = 1 option, multi = 3), negatives likewise.
 */
const PROFILE_BOUNDS: Record<string, { pos: number; neg: number }> = (() => {
  const bounds: Record<string, { pos: number; neg: number }> = {};
  for (const question of QUIZ_QUESTIONS) {
    const cap = question.type === "multi" ? 3 : 1;
    const pos = new Map<string, number[]>();
    const neg = new Map<string, number[]>();
    for (const option of question.options) {
      for (const [key, weight] of Object.entries(option.weights)) {
        const bucket = weight > 0 ? pos : neg;
        const list = bucket.get(key) ?? [];
        list.push(Math.abs(weight));
        bucket.set(key, list);
      }
    }
    for (const [key, list] of pos) {
      const best = list
        .sort((a, b) => b - a)
        .slice(0, cap)
        .reduce((s, v) => s + v, 0);
      const b = (bounds[key] ??= { pos: 0, neg: 0 });
      b.pos += best;
    }
    for (const [key, list] of neg) {
      const worst = list
        .sort((a, b) => b - a)
        .slice(0, cap)
        .reduce((s, v) => s + v, 0);
      const b = (bounds[key] ??= { pos: 0, neg: 0 });
      b.neg += worst;
    }
  }
  return bounds;
})();

/**
 * Translates quiz answers into a 0–100 trait vector for the user:
 * 50 = neutral, above 50 = wants MORE of that trait, below = wants less.
 * Only traits the user actually expressed are included.
 * Pure function — safe on client and server.
 */
export function computeUserProfile(
  answers: QuizAnswers
): Partial<Record<ScoreKey, number>> {
  const selected = collectSelections(answers);
  const net: Record<string, number> = {};
  for (const { option } of selected) {
    for (const [key, weight] of Object.entries(option.weights)) {
      net[key] = (net[key] ?? 0) + weight;
    }
  }

  const profile: Partial<Record<ScoreKey, number>> = {};
  for (const [key, value] of Object.entries(net)) {
    if (value === 0) continue;
    const bounds = PROFILE_BOUNDS[key];
    if (!bounds) continue;
    const v =
      value > 0
        ? 50 + (bounds.pos > 0 ? (50 * value) / bounds.pos : 0)
        : 50 - (bounds.neg > 0 ? (50 * -value) / bounds.neg : 0);
    profile[key as ScoreKey] = Math.round(Math.min(100, Math.max(0, v)));
  }
  return profile;
}
