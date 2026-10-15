// ─────────────────────────────────────────────────────────────
// DistroScope — core domain types
// Shared between dataset, matching engine, APIs and UI.
// ─────────────────────────────────────────────────────────────

export type DistroFamily =
  | "Ubuntu"
  | "Debian"
  | "Arch"
  | "Fedora"
  | "RHEL"
  | "SUSE"
  | "Gentoo"
  | "Independent";

export type PackageManager =
  | "apt"
  | "dnf"
  | "pacman"
  | "zypper"
  | "emerge"
  | "nix"
  | "xbps"
  | "apk"
  | "custom";

/**
 * Init (PID 1) system the distro ships by default.
 * "other" covers bespoke/busybox-style inits (Tiny Core, Puppy).
 */
export type InitSystem =
  | "systemd"
  | "OpenRC"
  | "runit"
  | "SysVinit"
  | "s6"
  | "dinit"
  | "shepherd"
  | "other";

export type ReleaseModel = "rolling" | "point";

/** Who steers the project day-to-day. */
export type Governance = "community" | "corporate" | "independent";

/**
 * Public posture toward AI-generated contributions & tooling.
 * - "reviewed": explicit human-accountability / provenance rules
 * - "permissive": no published policy (contributions judged on merit)
 * - "embracing": project prominently ships/promotes AI tooling
 */
export type AiPolicy = "reviewed" | "permissive" | "embracing";

export type DesktopEnvironment =
  | "GNOME"
  | "KDE Plasma"
  | "Xfce"
  | "Cinnamon"
  | "MATE"
  | "Budgie"
  | "LXQt"
  | "Pantheon"
  | "Deepin DE"
  | "i3"
  | "Sway"
  | "Hyprland"
  | "Cosmic"
  | "Trinity"
  | "Multiple";

/** Numeric trait vector (0–100) used by the graph axes and matching engine. */
export interface DistroScores {
  /** Higher = friendlier to absolute beginners */
  easeOfUse: number;
  /** Higher = more DIY / tweakable */
  customizability: number;
  /** Higher = lighter on hardware (low RAM/CPU usage) */
  performance: number;
  /** Higher = codecs, drivers & apps preinstalled */
  outOfBox: number;
  /** Higher = fewer breakages, predictable */
  stability: number;
  /** Higher = newest software versions sooner */
  freshness: number;
  /** Higher = stronger privacy & data respect */
  privacyFocus: number;
  /** Higher = better gaming stack (drivers, tools) */
  gamingSupport: number;
  /** Higher = better developer experience */
  devExperience: number;
  /** Higher = larger community, easy to find help */
  communitySupport: number;
  /** Higher = excellent documentation */
  documentation: number;
  /** Higher = resembles macOS look/feel */
  macLike: number;
  /** Higher = resembles Windows look/feel */
  windowsLike: number;
  /** Higher = classic panel+menu workflow */
  traditionalUI: number;
  /** Higher = better as a server / headless host */
  serverUse: number;
  /** Higher = better ARM / Raspberry Pi support */
  armSupport: number;
  /** Higher = smoother NVIDIA experience out of the box */
  nvidiaSupport: number;
}

export type ScoreKey = keyof DistroScores;

export interface Distro {
  /** kebab-case slug, unique */
  id: string;
  name: string;
  /** one-liner, max ~60 chars */
  tagline: string;
  /** 2–3 sentences, neutral and factual */
  description: string;
  family: DistroFamily;
  /** parent distro or null */
  basedOn: string | null;
  desktops: DesktopEnvironment[];
  packageManager: PackageManager;
  /** init system shipped as default (PID 1) */
  initSystem: InitSystem;
  /** human note when alternatives exist, e.g. "also offers runit/s6/dinit" */
  initNote?: string;
  /** who governs the project */
  governance: Governance;
  /** posture toward AI-generated contributions & tooling */
  aiPolicy: AiPolicy;
  releaseModel: ReleaseModel;
  scores: DistroScores;
  /** 0–100, DistroWatch-page-hit-inspired rough popularity */
  popularity: number;
  /** realistic minimum RAM (MB) for comfortable daily use */
  ramMin: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  useCases: string[];
  pros: string[];
  cons: string[];
  website: string;
  /** brand hex color used for the graph bubble */
  color: string;
  /** 1–3 letters rendered inside the bubble */
  initials: string;
  /** still actively maintained in 2024+ */
  active: boolean;
}

// ── Quiz ─────────────────────────────────────────────────────

export type QuestionType = "single" | "multi";

export interface QuizOption {
  id: string;
  label: string;
  /** short helper text shown under the label */
  hint?: string;
  /** lucide icon name, must exist in lucide-react */
  icon: string;
  /**
   * Contribution to the score vector. Positive numbers reward distros with a
   * HIGH value for that trait, negative numbers reward distros with a LOW
   * value. Magnitude ~1–4.
   */
  weights: Partial<Record<ScoreKey, number>>;
  /**
   * Soft init-system preference: distros matching it get a scoring bonus
   * (weaker than hardRequirements.initSystems, which outright filters).
   */
  preferInit?: "systemd" | "non-systemd";
  /** Soft governance preference (community / corporate / independent). */
  preferGovernance?: Governance;
  /** Soft AI-posture preference (reviewed / permissive / embracing). */
  preferAi?: AiPolicy;
  /** Hard constraints when this option is selected */
  hardRequirements?: {
    /** distro must have armSupport >= 50 */
    needsArm?: boolean;
    /** distro must have ramMin <= value (MB) */
    maxRam?: number;
    /** distro must include one of these use-case tags */
    tags?: string[];
    /** distro's default init system must be in this allowlist */
    initSystems?: InitSystem[];
  };
}

export interface QuizQuestion {
  id: string;
  title: string;
  subtitle?: string;
  /** short human explanation shown in the "why we ask" tooltip */
  why?: string;
  type: QuestionType;
  icon: string;
  options: QuizOption[];
}

// ── Quiz answers payload ─────────────────────────────────────

/** questionId -> selected optionIds (length 1 for single-select) */
export type QuizAnswers = Record<string, string[]>;

// ── Matching results ─────────────────────────────────────────

export interface MatchReason {
  /** short bold headline, e.g. "Sips resources" */
  title: string;
  /** one sentence tying it to the user's answers */
  detail: string;
}

export interface DistroMatch {
  distro: Distro;
  /** 0–100 normalized match percentage */
  score: number;
  reasons: MatchReason[];
  /**
   * Human-readable hard requirements this distro violates — only present in
   * relaxed fallback mode, when the strict filter eliminated every distro.
   */
  compromises?: string[];
}

export interface MatchResponse {
  matches: DistroMatch[];
  totalQuizzes: number;
  /** true when hard filters had to be relaxed to produce any matches */
  relaxed?: boolean;
}

export interface MatchResult {
  matches: DistroMatch[];
  /** true when hard filters had to be relaxed to produce any matches */
  relaxed: boolean;
}

// ── Community stats ──────────────────────────────────────────

export interface StatsResponse {
  totalQuizzes: number;
  topMatches: { name: string; count: number }[];
  /** most-loved distro by thumbs-up feedback ratio (null when no feedback yet) */
  favorite?: { name: string; up: number; down: number } | null;
  /** quiz activity per UTC day, oldest first, always exactly 14 entries */
  daily: { date: string; count: number }[];
  /** quiz-result share per distro family, highest first (top 6) */
  families?: { family: string; count: number }[];
  /** top matches recorded in the last 7 days, highest first */
  weekly?: { name: string; count: number }[];
  /** most-compared distro pairs/trios, highest first (top 5) */
  compared?: { ids: string[]; count: number }[];
}
