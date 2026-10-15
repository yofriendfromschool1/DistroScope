"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Apple,
  AppWindow,
  Boxes,
  Chrome,
  Dices,
  Download,
  Gamepad2,
  LayoutGrid,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Swords,
  Table2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DistroDialog } from "@/components/distro-dialog";
import { SectionEyebrow } from "@/components/section-eyebrow";
import { CompareDialog } from "@/components/compare-dialog";
import { DistroTable } from "@/components/distro-table";
import { DiceBurst } from "@/components/dice-burst";
import { useToast } from "@/hooks/use-toast";
import { DISTROS, FAMILY_META, OS_SIMILARITY } from "@/data/distros";
import { useDistroScope } from "@/lib/store";
import { recordCompare } from "@/lib/compare-track";
import {
  readCompareParam,
  syncCompareParam,
} from "@/lib/quiz-url";
import type { Distro, DistroFamily, ScoreKey } from "@/lib/types";
import { TRAIT_KEYS, TRAIT_LABELS, profileSimilarity } from "@/lib/similarity";
import { cn } from "@/lib/utils";

const TRAIT_CSV_LABELS: Record<string, string> = {
  easeOfUse: "Ease of use",
  customizability: "Customizability",
  performance: "Performance",
  outOfBox: "Out of box",
  stability: "Stability",
  freshness: "Freshness",
  privacyFocus: "Privacy focus",
  gamingSupport: "Gaming support",
  devExperience: "Dev experience",
  communitySupport: "Community support",
  documentation: "Documentation",
  macLike: "macOS-like",
  windowsLike: "Windows-like",
  traditionalUI: "Traditional UI",
  serverUse: "Server use",
  armSupport: "ARM support",
  nvidiaSupport: "NVIDIA support",
};

// ── Axis presets ─────────────────────────────────────────────

const AXIS_PRESETS = [
  {
    id: "ease",
    label: "Ease & Control",
    x: {
      key: "easeOfUse" as ScoreKey,
      low: "Expert territory",
      high: "Beginner-friendly",
    },
    y: {
      key: "customizability" as ScoreKey,
      low: "Opinionated",
      high: "Limitless tweaking",
    },
  },
  {
    id: "ready",
    label: "Ready vs Lean",
    x: {
      key: "outOfBox" as ScoreKey,
      low: "Bring your own",
      high: "Works instantly",
    },
    y: {
      key: "performance" as ScoreKey,
      low: "Heavier / fuller",
      high: "Featherweight",
    },
  },
  {
    id: "solid",
    label: "Solid vs Fresh",
    x: {
      key: "stability" as ScoreKey,
      low: "Moves fast",
      high: "Rock solid",
    },
    y: {
      key: "freshness" as ScoreKey,
      low: "Mature & steady",
      high: "Bleeding edge",
    },
  },
];

// ── Filters ──────────────────────────────────────────────────

interface FilterState {
  search: string;
  families: DistroFamily[];
  packageManagers: string[];
  initSystems: string[];
  desktops: string[];
  release: "all" | "rolling" | "point";
  minPerformance: number;
  gamingOnly: boolean;
  privacyOnly: boolean;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  families: [],
  packageManagers: [],
  initSystems: [],
  desktops: [],
  release: "all",
  minPerformance: 0,
  gamingOnly: false,
  privacyOnly: false,
};

function passesFilters(d: Distro, f: FilterState): boolean {
  if (f.search) {
    const q = f.search.toLowerCase();
    const haystack = `${d.name} ${d.tagline} ${d.basedOn ?? ""} ${d.family}`;
    if (!haystack.toLowerCase().includes(q)) return false;
  }
  if (f.families.length && !f.families.includes(d.family)) return false;
  if (f.packageManagers.length && !f.packageManagers.includes(d.packageManager))
    return false;
  if (f.initSystems.length && !f.initSystems.includes(d.initSystem))
    return false;
  if (f.desktops.length && !d.desktops.some((x) => f.desktops.includes(x)))
    return false;
  if (f.release !== "all" && d.releaseModel !== f.release) return false;
  if (d.scores.performance < f.minPerformance) return false;
  if (f.gamingOnly && d.scores.gamingSupport < 75) return false;
  if (f.privacyOnly && d.scores.privacyFocus < 75) return false;
  return true;
}

// deterministic jitter so same-score distros don't perfectly overlap
function jitter(id: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  return ((Math.abs(h) % 1000) / 1000) * 4.6 - 2.3;
}

// ── Small UI pieces ──────────────────────────────────────────

function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all duration-200 sm:py-1.5",
        active
          ? "border-fuchsia-300/40 bg-fuchsia-400/15 text-fuchsia-100 shadow-[0_0_16px_rgb(232_121_249/0.15)]"
          : "border-white/12 bg-white/[0.04] text-foreground/70 hover:border-white/25 hover:bg-white/[0.09] hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function SwitchRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Icon className="size-4 text-fuchsia-300/80" />
        {label}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function performanceLabel(v: number): string {
  if (v <= 0) return "Anything goes";
  if (v < 30) return "Reasonably light";
  if (v < 55) return "Light";
  if (v < 75) return "Very light";
  return "Featherweights only";
}

// shared compare tray bar — floats on the graph, sits under the table
function CompareTrayBar({
  compare,
  onToggle,
  onClear,
  onOpen,
  onShare,
}: {
  compare: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onOpen: () => void;
  onShare: () => void;
}) {
  return (
    <div className="glass-strong flex items-center gap-2 rounded-2xl p-2 pl-3.5">
      <span className="hidden shrink-0 text-xs font-medium text-muted-foreground sm:block">
        Compare
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {compare.map((id) => {
          const d = DISTROS.find((x) => x.id === id);
          if (!d) return null;
          return (
            <span
              key={id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-white/[0.05] py-1 pl-2 pr-1 text-xs font-medium transition-colors"
              style={{ borderColor: `${d.color}55` }}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{
                  background: d.color,
                  boxShadow: `0 0 8px ${d.color}88`,
                }}
              />
              <span className="truncate">{d.name}</span>
              <button
                type="button"
                onClick={() => onToggle(id)}
                className="grid size-4 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                aria-label={`Remove ${d.name} from compare`}
              >
                <X className="size-3" />
              </button>
            </span>
          );
        })}
      </div>
      <Button
        size="sm"
        onClick={onOpen}
        disabled={compare.length < 2}
        className="h-8 shrink-0 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 text-xs font-medium hover:brightness-110"
      >
        Compare {compare.length}
      </Button>
      <button
        type="button"
        onClick={onShare}
        className="glass-soft grid size-8 shrink-0 place-items-center rounded-lg border-white/10 text-muted-foreground transition-all hover:border-fuchsia-300/40 hover:text-fuchsia-200"
        aria-label="Copy a shareable link to this comparison"
        title="Share this comparison"
      >
        <Share2 className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onClear}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        aria-label="Clear compare tray"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

const FAMILY_KEYS = Object.keys(FAMILY_META) as DistroFamily[];

// ── Persisted view preference, hydration-safe ────────────────
// useSyncExternalStore returns the SERVER snapshot (null) during hydration —
// matching SSR — then swaps to the localStorage value after mount. React
// handles that switch without a hydration mismatch, and no setState-in-effect
// is needed.

const VIEW_STORAGE_KEY = "distroscope:view";

function subscribeViewPref(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getViewPrefSnapshot(): string | null {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerViewPrefSnapshot(): string | null {
  return null;
}

export function GraphExplorer() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [presetId, setPresetId] = useState(AXIS_PRESETS[0].id);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [osFocus, setOsFocus] = useState<
    "windows" | "macos" | "chromeos" | null
  >(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Hydration-safe view mode: SSR always renders "graph"; after mount the
  // persisted preference (if any) takes over until the user picks a view.
  const persistedView = useSyncExternalStore(
    subscribeViewPref,
    getViewPrefSnapshot,
    getServerViewPrefSnapshot
  );
  const [viewPick, setViewPick] = useState<"graph" | "table" | null>(null);
  const viewMode = viewPick ?? (persistedView === "table" ? "table" : "graph");
  const setViewMode = setViewPick;
  const [diceSpin, setDiceSpin] = useState(0);
  const [surpriseAccent, setSurpriseAccent] = useState("#fbbf24");
  const { toast } = useToast();

  const highlight = useDistroScope((s) => s.highlight);
  const clearHighlight = useDistroScope((s) => s.clearHighlight);
  const compare = useDistroScope((s) => s.compare);
  const toggleCompare = useDistroScope((s) => s.toggleCompare);
  const setCompare = useDistroScope((s) => s.setCompare);
  const clearCompare = useDistroScope((s) => s.clearCompare);
  /** quiz-taker's trait vector — powers the "You vs this distro" radar overlay */
  const profile = useDistroScope((s) => s.profile);

  const preset = AXIS_PRESETS.find((p) => p.id === presetId) ?? AXIS_PRESETS[0];

  // quiz highlights take precedence over OS-similarity focus; clicking an OS
  // chip explicitly hands focus back, so no effect is needed
  const effectiveOsFocus = highlight.length > 0 ? null : osFocus;

  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const toggleIn = <
    K extends "families" | "packageManagers" | "initSystems" | "desktops",
  >(key: K, value: string) =>
    setFilters((f) => {
      const list = f[key] as string[];
      const next = list.includes(value)
        ? list.filter((x) => x !== value)
        : [...list, value];
      return { ...f, [key]: next } as FilterState;
    });

  const packageManagers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of DISTROS)
      counts.set(d.packageManager, (counts.get(d.packageManager) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, []);

  const initOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of DISTROS)
      counts.set(d.initSystem, (counts.get(d.initSystem) ?? 0) + 1);
    // systemd first (most common), then the alternatives alphabetically
    return [...counts.entries()].sort(
      (a, b) =>
        (b[0] === "systemd" ? 1 : 0) - (a[0] === "systemd" ? 1 : 0) ||
        a[0].localeCompare(b[0])
    );
  }, []);

  const desktopOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of DISTROS)
      for (const de of d.desktops)
        if (de !== "Multiple")
          counts.set(de, (counts.get(de) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, []);

  const filtered = useMemo(
    () => DISTROS.filter((d) => passesFilters(d, filters)),
    [filters]
  );

  const positioned = useMemo(
    () =>
      filtered
        .map((d) => ({
          distro: d,
          x: 5 + d.scores[preset.x.key] * 0.9 + jitter(d.id, 7),
          y: 93 - d.scores[preset.y.key] * 0.86 + jitter(d.id, 13),
          size: 24 + (d.popularity / 100) * 40,
        }))
        // big bubbles first in the DOM so smaller ones stack above them
        .sort((a, b) => b.size - a.size),
    [filtered, preset]
  );

  const activeHighlight = effectiveOsFocus ? OS_SIMILARITY[effectiveOsFocus] : highlight;

  const hovered = positioned.find((p) => p.distro.id === hoveredId) ?? null;
  const selected = DISTROS.find((d) => d.id === selectedId) ?? null;

  const surpriseMe = () => {
    const pool = filtered.length > 0 ? filtered : DISTROS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setDiceSpin((n) => n + 1);
    setSurpriseAccent(pick.color);
    setSelectedId(pick.id);
    toast({
      title: `Rolled the dice — ${pick.name}`,
      description: pick.tagline,
    });
  };

  const exportCsv = () => {
    const pool = filtered.length > 0 ? filtered : DISTROS;
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replaceAll("\"", "\"\"")}"` : s;
    };
    const header = [
      "Name",
      "Family",
      "Based on",
      "Package manager",
      "Release model",
      "Desktops",
      "Min RAM (MB)",
      "Difficulty (1-5)",
      "Popularity",
      ...TRAIT_KEYS.map((k) => TRAIT_CSV_LABELS[k] ?? k),
      "Website",
    ];
    const rows = pool.map((d) => [
      d.name,
      d.family,
      d.basedOn ?? "Independent",
      d.packageManager,
      d.releaseModel,
      d.desktops.join("; "),
      d.ramMin,
      d.difficulty,
      d.popularity,
      ...TRAIT_KEYS.map((k) => d.scores[k]),
      d.website,
    ]);
    const csv = `\uFEFF${[header, ...rows]
      .map((r) => r.map(esc).join(","))
      .join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "distroscope-export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast({
      title: "CSV exported",
      description: `${pool.length} distro${pool.length === 1 ? "" : "s"} with all 17 trait scores — filters respected.`,
    });
  };

  // keep the latest surpriseMe for the global hotkey
  const surpriseRef = useRef(surpriseMe);
  useEffect(() => {
    surpriseRef.current = surpriseMe;
  });

  // restore a shared comparison from ?c= (before the sync effect can run)
  const restoredCompareRef = useRef(false);
  useEffect(() => {
    if (restoredCompareRef.current) return;
    restoredCompareRef.current = true;
    const validIds = new Set(DISTROS.map((d) => d.id));
    const restored = readCompareParam(validIds);
    if (restored.length > 0) {
      setCompare(restored);
      toast({
        title: "Comparison restored from link",
        description: `${restored.length} distro${restored.length > 1 ? "s" : ""} loaded into the tray.`,
      });
    }
  }, []);

  // keep ?c= in sync with the tray so any comparison is shareable
  useEffect(() => {
    if (!restoredCompareRef.current) return;
    const params = syncCompareParam(compare);
    const qs = params.toString();
    try {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`
      );
    } catch {
      // non-critical
    }
  }, [compare]);

  const shareCompare = async () => {
    if (compare.length === 0) return;
    const params = syncCompareParam(compare);
    const link = `${window.location.origin}${window.location.pathname}?${params.toString()}#explore`;
    const names = compare
      .map((id) => DISTROS.find((d) => d.id === id)?.name)
      .filter(Boolean)
      .join(" vs ");
    try {
      await navigator.clipboard.writeText(`DistroScope — ${names}: ${link}`);
      toast({
        title: "Comparison link copied",
        description: "Anyone opening it sees the same distros side by side.",
      });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  // persist an explicitly picked view (skips the restore pass — the store
  // already holds whatever was saved)
  useEffect(() => {
    if (viewPick === null) return;
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, viewPick);
    } catch {
      // non-critical
    }
  }, [viewPick]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const el = document.getElementById("explore");
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      if (key === "s") {
        e.preventDefault();
        surpriseRef.current();
      } else if (key === "g" || key === "t") {
        e.preventDefault();
        setViewMode(key === "g" ? "graph" : "table");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // command palette bridges — open distro / switch view / surprise / filter family / open compare
  useEffect(() => {
    const onOpenDistro = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (typeof id !== "string") return;
      const d = DISTROS.find((x) => x.id === id);
      if (!d) return;
      setSelectedId(d.id);
      const el = document.getElementById("explore");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const onSetView = (e: Event) => {
      const mode = (e as CustomEvent<string>).detail;
      if (mode === "graph" || mode === "table") {
        setViewMode(mode);
        const el = document.getElementById("explore");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    const onSurprise = () => surpriseRef.current();
    const onFilterFamily = (e: Event) => {
      const family = (e as CustomEvent<string>).detail;
      if (typeof family !== "string") return;
      const known = FAMILY_META[family as DistroFamily];
      if (!known) return;
      setFilters((f) => ({
        ...f,
        families: f.families.includes(family as DistroFamily)
          ? f.families
          : [...f.families, family as DistroFamily],
      }));
      const el = document.getElementById("explore");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const onOpenCompare = (e: Event) => {
      const ids = (e as CustomEvent<string[]>).detail;
      if (!Array.isArray(ids)) return;
      const validIds = new Set(DISTROS.map((d) => d.id));
      const valid = ids
        .filter((id) => typeof id === "string" && validIds.has(id))
        .slice(0, 3);
      if (valid.length < 2) return;
      setCompare(valid);
      setCompareOpen(true);
      const el = document.getElementById("explore");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("distroscope:open-distro", onOpenDistro);
    window.addEventListener("distroscope:set-view", onSetView);
    window.addEventListener("distroscope:surprise", onSurprise);
    window.addEventListener("distroscope:filter-family", onFilterFamily);
    window.addEventListener("distroscope:open-compare", onOpenCompare);
    return () => {
      window.removeEventListener("distroscope:open-distro", onOpenDistro);
      window.removeEventListener("distroscope:set-view", onSetView);
      window.removeEventListener("distroscope:surprise", onSurprise);
      window.removeEventListener("distroscope:filter-family", onFilterFamily);
      window.removeEventListener("distroscope:open-compare", onOpenCompare);
    };
  }, []);

  // a comparison was actually viewed — feed the community duel arena
  // (deduped per browser; reopening the same pair never double-counts)
  useEffect(() => {
    if (compareOpen && compare.length >= 2) {
      recordCompare(compare);
    }
  }, [compareOpen, compare]);

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    filters.families.length +
    filters.packageManagers.length +
    filters.initSystems.length +
    filters.desktops.length +
    (filters.release !== "all" ? 1 : 0) +
    (filters.minPerformance > 0 ? 1 : 0) +
    (filters.gamingOnly ? 1 : 0) +
    (filters.privacyOnly ? 1 : 0);

  const filterPanel = (
    <div className="glass max-h-none space-y-6 overflow-y-auto rounded-3xl p-5 scrollbar-slim lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold max-lg:hidden">
          <SlidersHorizontal className="size-4 text-fuchsia-300" />
          Filters
        </h3>
        <button
          type="button"
          onClick={() => setFilters(INITIAL_FILTERS)}
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      </div>

      <FilterGroup title="Family">
        {FAMILY_KEYS.map((f) => {
          const meta = FAMILY_META[f];
          const count = DISTROS.filter((d) => d.family === f).length;
          return (
            <Chip
              key={f}
              active={filters.families.includes(f)}
              onClick={() => toggleIn("families", f)}
            >
              <span
                className="size-2 rounded-full"
                style={{
                  background: meta.color,
                  boxShadow: `0 0 6px ${meta.color}88`,
                }}
              />
              {f}
              <span className="text-[10px] text-muted-foreground/70">
                {count}
              </span>
            </Chip>
          );
        })}
      </FilterGroup>

      <FilterGroup title="Package manager">
        {packageManagers.map(([pm, count]) => (
          <Chip
            key={pm}
            active={filters.packageManagers.includes(pm)}
            onClick={() => toggleIn("packageManagers", pm)}
          >
            <span className="font-mono">{pm}</span>
            <span className="text-[10px] text-muted-foreground/70">
              {count}
            </span>
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup title="Init system">
        {initOptions.map(([init, count]) => (
          <Chip
            key={init}
            active={filters.initSystems.includes(init)}
            onClick={() => toggleIn("initSystems", init)}
          >
            <span
              className={
                init === "systemd"
                  ? "font-mono"
                  : "font-mono font-semibold text-amber-200/90"
              }
            >
              {init}
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              {count}
            </span>
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup title="Desktop environment">
        {desktopOptions.map(([de, count]) => (
          <Chip
            key={de}
            active={filters.desktops.includes(de)}
            onClick={() => toggleIn("desktops", de)}
          >
            {de}
            <span className="text-[10px] text-muted-foreground/70">
              {count}
            </span>
          </Chip>
        ))}
      </FilterGroup>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Release model
        </p>
        <div className="glass-soft mt-2.5 grid grid-cols-3 gap-1 rounded-xl p-1">
          {(["all", "point", "rolling"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => set("release", mode)}
              className={cn(
                "rounded-lg py-1.5 text-xs font-medium capitalize transition-all",
                filters.release === mode
                  ? "bg-gradient-to-r from-violet-500/80 to-fuchsia-500/80 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "all" ? "All" : mode}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Performance floor
          </p>
          <p className="text-[11px] font-medium text-fuchsia-200">
            {performanceLabel(filters.minPerformance)}
          </p>
        </div>
        <Slider
          value={[filters.minPerformance]}
          onValueChange={([v]) => set("minPerformance", v)}
          max={95}
          step={5}
          className="mt-3"
          aria-label="Minimum performance score"
        />
      </div>

      <div className="space-y-3.5 border-t border-white/5 pt-5">
        <SwitchRow
          icon={Gamepad2}
          label="Gaming focus"
          checked={filters.gamingOnly}
          onChange={(v) => set("gamingOnly", v)}
        />
        <SwitchRow
          icon={ShieldCheck}
          label="Privacy focus"
          checked={filters.privacyOnly}
          onChange={(v) => set("privacyOnly", v)}
        />
      </div>
    </div>
  );

  return (
    <section
      id="explore"
      className={cn(
        "relative mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20",
        viewMode === "table"
          ? "print:block print:py-6"
          : "print:hidden"
      )}
    >
      <header className="max-w-2xl print:hidden">
        <SectionEyebrow index="01" label="Explore" icon={Boxes} tone="violet" align="left" />
        <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          The <span className="text-gradient">distro universe</span>, on one
          map
        </h2>
        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          Every bubble is a distro — sized by popularity, colored by family.
          Switch axes, filter the noise, and click anything that glows to dig
          in. Add up to three to compare side by side.
        </p>
      </header>

      {/* controls row */}
      <div className="mt-8 flex flex-wrap items-center gap-2.5 print:hidden">
        {viewMode === "graph" && (
          <div
            className="glass flex gap-1 rounded-xl p-1"
            role="tablist"
            aria-label="Graph axes"
          >
            {AXIS_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={presetId === p.id}
                onClick={() => setPresetId(p.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  presetId === p.id
                    ? "bg-gradient-to-r from-violet-500/85 to-fuchsia-500/85 text-white shadow-[0_4px_16px_rgb(192_132_252/0.3)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* toolbar divider */}
        {viewMode === "graph" && (
          <div className="hidden h-6 w-px shrink-0 bg-white/10 sm:block" aria-hidden="true" />
        )}

        {/* view toggle */}
        <div
          className="glass flex gap-1 rounded-xl p-1"
          role="tablist"
          aria-label="Explorer view"
        >
          {(
            [
              { id: "graph", label: "Graph", icon: LayoutGrid },
              { id: "table", label: "Table", icon: Table2 },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={viewMode === v.id}
              onClick={() => setViewMode(v.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
                viewMode === v.id
                  ? "bg-gradient-to-r from-violet-500/85 to-fuchsia-500/85 text-white shadow-[0_4px_16px_rgb(192_132_252/0.3)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <v.icon className="size-3.5" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[170px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder="Search distros..."
            className="glass h-10 rounded-xl border-white/10 pl-9 text-[13px] placeholder:text-muted-foreground/60"
          />
        </div>

        {/* surprise me */}
        <div className="relative">
          <DiceBurst trigger={diceSpin} accent={surpriseAccent} />
          <Button
            variant="outline"
            onClick={surpriseMe}
            title="Surprise me — roll a random distro, respects your filters (hotkey: S)"
            className="glass group h-10 rounded-xl border-white/10 px-3.5 text-[13px] font-medium text-foreground transition-all hover:border-amber-300/30 hover:bg-amber-400/10 hover:text-amber-100 active:scale-95"
          >
            <motion.span
              key={diceSpin}
              initial={{ rotate: 0, scale: 1 }}
              animate={
                diceSpin > 0 ? { rotate: 360 + diceSpin * 40, scale: [1, 1.35, 1] } : {}
              }
              transition={{
                rotate: { type: "spring", stiffness: 260, damping: 14 },
                scale: { duration: 0.45, times: [0, 0.5, 1] },
              }}
              className="grid place-items-center"
            >
              <Dices className="size-4 transition-transform duration-500 group-hover:rotate-180" />
            </motion.span>
            <span className="hidden sm:inline">Surprise me</span>
          </Button>
        </div>

        {/* export CSV */}
        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          title="Download the current filtered pool as CSV (all 17 trait scores)"
          className="glass group h-10 rounded-xl border-white/10 px-3.5 text-[13px] font-medium text-foreground transition-all hover:border-emerald-300/30 hover:bg-emerald-400/10 hover:text-emerald-100"
        >
          <Download className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>

        <div className="lg:hidden">
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="glass h-10 rounded-xl border-white/10 px-3.5 text-[13px] font-medium"
              >
                <SlidersHorizontal className="size-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="grid size-5 place-items-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="glass-strong max-h-[85vh] overflow-y-auto rounded-t-3xl border-white/10 p-0 scrollbar-slim"
            >
              <div className="px-2 pb-8 pt-2">
                <SheetTitle className="px-3 text-sm font-semibold">
                  Filters
                </SheetTitle>
                <div className="mt-4 px-1">{filterPanel}</div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* OS similarity */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-xs font-medium text-muted-foreground">
          Coming from
        </span>
        {(
          [
            { id: "windows", label: "Windows", icon: AppWindow },
            { id: "macos", label: "macOS", icon: Apple },
            { id: "chromeos", label: "ChromeOS", icon: Chrome },
          ] as const
        ).map((os) => (
          <Chip
            key={os.id}
            active={effectiveOsFocus === os.id}
            onClick={() => {
              if (osFocus === os.id) {
                setOsFocus(null);
              } else {
                clearHighlight();
                setOsFocus(os.id);
              }
            }}
          >
            <os.icon className="size-3.5" />
            {os.label}
            <span className="text-[10px] text-muted-foreground/70">
              {OS_SIMILARITY[os.id].length}
            </span>
          </Chip>
        ))}
        {effectiveOsFocus && (
          <span className="text-[11px] text-muted-foreground">
            closest matches glowing
          </span>
        )}
      </div>

      {/* main layout */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[268px_1fr] print:block">
        <aside className="hidden lg:block print:hidden">{filterPanel}</aside>

        <div>
          {viewMode === "graph" ? (
            <div className="glass relative overflow-hidden rounded-3xl p-2.5 sm:p-4">
              {/* status row */}
              <div className="flex min-h-8 flex-wrap items-center justify-between gap-2 px-2 pt-1.5">
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono font-semibold text-foreground">
                    {filtered.length}
                  </span>{" "}
                  of {DISTROS.length} distros
                  {activeFilterCount > 0 && " shown"}
                </p>
                {activeHighlight.length > 0 && (
                  <button
                    type="button"
                    onClick={clearHighlight}
                    className="glass-soft flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-fuchsia-200 transition-colors hover:bg-white/10"
                  >
                    <span className="size-1.5 animate-pulse-soft rounded-full bg-fuchsia-400" />
                    Your quiz matches
                    <X className="size-3" />
                  </button>
                )}
              </div>

            <div className="relative aspect-square min-h-[340px] w-full sm:aspect-[16/10]">
              {/* grid lines */}
              {[25, 50, 75].map((p) => (
                <div
                  key={`h${p}`}
                  className="pointer-events-none absolute inset-x-0 border-t border-white/[0.05]"
                  style={{ top: `${p}%` }}
                />
              ))}
              {[25, 50, 75].map((p) => (
                <div
                  key={`v${p}`}
                  className="pointer-events-none absolute inset-y-0 border-l border-white/[0.05]"
                  style={{ left: `${p}%` }}
                />
              ))}

              {/* axis labels */}
              <span className="pointer-events-none absolute left-2 top-2 text-[10.5px] font-semibold text-muted-foreground sm:text-[11.5px]">
                ↑ {preset.y.high}
              </span>
              <span className="pointer-events-none absolute bottom-9 left-2 text-[10.5px] font-semibold text-muted-foreground sm:text-[11.5px]">
                ↓ {preset.y.low}
              </span>
              <span className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10.5px] font-semibold text-muted-foreground sm:text-[11.5px]">
                ← {preset.x.low} · {preset.x.high} →
              </span>

              {/* bubbles */}
              <AnimatePresence>
                {positioned.map(({ distro: d, x, y, size }) => {
                  const isHighlighted = activeHighlight.includes(d.id);
                  const dimmed =
                    activeHighlight.length > 0 && !isHighlighted;
                  const inCompare = compare.includes(d.id);
                  const isHovered = hoveredId === d.id;
                  return (
                    <motion.button
                      key={d.id}
                      type="button"
                      initial={{ opacity: 0, scale: 0.3 }}
                      animate={{
                        left: `${x}%`,
                        top: `${y}%`,
                        opacity: dimmed ? 0.16 : 1,
                        scale: isHighlighted
                          ? 1.14
                          : dimmed
                            ? 0.88
                            : isHovered
                              ? 1.08
                              : 1,
                      }}
                      exit={{ opacity: 0, scale: 0.3 }}
                      transition={{
                        type: "spring",
                        stiffness: 240,
                        damping: 26,
                        opacity: { duration: 0.25 },
                      }}
                      className={cn(
                        "group absolute rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300/80",
                        inCompare && "ring-2 ring-white/40"
                      )}
                      style={{
                        width: size,
                        height: size,
                        zIndex: isHovered || isHighlighted ? 20 : 10,
                        x: "-50%",
                        y: "-50%",
                      }}
                      onMouseEnter={() => setHoveredId(d.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onFocus={() => setHoveredId(d.id)}
                      onBlur={() => setHoveredId(null)}
                      onClick={() => setSelectedId(d.id)}
                      aria-label={`${d.name}: ${d.tagline}. Press to open details.`}
                    >
                      <span
                        className="absolute inset-0 rounded-full transition-all duration-300"
                        style={{
                          background: `radial-gradient(circle at 32% 30%, ${d.color}e6, ${d.color}66 55%, ${d.color}1a)`,
                          border: `1px solid ${d.color}99`,
                          boxShadow: `0 0 ${Math.round(size * 0.45)}px ${d.color}${dimmed ? "11" : "44"}`,
                        }}
                      />
                      {/* specular highlight — the liquid-glass sphere look */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-[24%] top-[19%] size-[17%] rounded-full bg-white/55 blur-[1.5px]"
                      />
                      {/* hover halo — intensifies the family glow */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-1 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{
                          boxShadow: `0 0 ${Math.round(size * 0.75)}px ${d.color}66`,
                          border: `1px solid ${d.color}55`,
                        }}
                      />
                      {isHighlighted && (
                        <span
                          className="absolute -inset-1.5 animate-pulse-soft rounded-full border-2"
                          style={{ borderColor: `${d.color}aa` }}
                        />
                      )}
                      <span className="absolute inset-0 grid place-items-center font-mono text-[10px] font-bold text-white/95">
                        {d.initials}
                      </span>
                      {d.popularity >= 78 && !dimmed && (
                        <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/8 bg-black/45 px-2 py-0.5 text-[9.5px] font-medium text-white/80 backdrop-blur-sm">
                          {d.name}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              {/* tooltip */}
              <AnimatePresence>
                {hovered && (
                  <motion.div
                    key={hovered.distro.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="pointer-events-none absolute z-40 w-48 sm:w-52"
                    style={{
                      left: `${Math.min(86, Math.max(14, hovered.x))}%`,
                      top: `${hovered.y}%`,
                      transform:
                        hovered.y < 28
                          ? "translate(-50%, 18px)"
                          : "translate(-50%, calc(-100% - 18px))",
                    }}
                  >
                    <div className="glass-strong rounded-2xl p-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            background: hovered.distro.color,
                            boxShadow: `0 0 8px ${hovered.distro.color}88`,
                          }}
                        />
                        <p className="truncate text-sm font-semibold">
                          {hovered.distro.name}
                        </p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                        {hovered.distro.tagline}
                      </p>

                      {/* axis-relevant mini stat bars — reflect the preset */}
                      <div className="mt-2.5 space-y-1.5">
                        {[preset.y, preset.x].map((axis) => (
                          <div
                            key={axis.key}
                            className="flex items-center gap-2"
                          >
                            <span className="w-14 shrink-0 truncate text-[9.5px] uppercase tracking-wide text-muted-foreground/70">
                              {TRAIT_LABELS[axis.key] ?? axis.key}
                            </span>
                            <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                              <span
                                className="absolute inset-y-0 left-0 rounded-full"
                                style={{
                                  width: `${hovered.distro.scores[axis.key]}%`,
                                  background: `linear-gradient(to right, ${hovered.distro.color}66, ${hovered.distro.color})`,
                                }}
                              />
                            </span>
                            <span className="w-6 shrink-0 text-right font-mono text-[9.5px] text-muted-foreground">
                              {hovered.distro.scores[axis.key]}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* quiz-taker fit line */}
                      {profile && (
                        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-fuchsia-300/20 bg-fuchsia-400/[0.08] px-2 py-1.5">
                          <Swords className="size-3 shrink-0 text-fuchsia-300" />
                          <span className="text-[10.5px] font-medium text-fuchsia-200">
                            You:{" "}
                            {profileSimilarity(profile, hovered.distro) ??
                              "—"}
                            % alike
                          </span>
                        </div>
                      )}

                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {[
                          hovered.distro.family,
                          hovered.distro.packageManager,
                          `${hovered.distro.ramMin} MB`,
                        ].map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full border border-white/8 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* empty state */}
              {filtered.length === 0 && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="glass-soft rounded-2xl px-6 py-5 text-center">
                    <p className="text-sm font-medium">
                      No distros match these filters
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Even Tux has limits.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFilters(INITIAL_FILTERS)}
                      className="glass mt-3 h-8 rounded-lg border-white/10 text-xs"
                    >
                      <RotateCcw className="size-3.5" />
                      Reset filters
                    </Button>
                  </div>
                </div>
              )}

              {/* compare tray (floating, graph mode) */}
              <AnimatePresence>
                {compare.length > 0 && (
                  <motion.div
                    initial={{ y: 64, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 64, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute inset-x-2.5 bottom-2.5 z-30 sm:inset-x-4 sm:bottom-3"
                  >
                    <CompareTrayBar
                      compare={compare}
                      onToggle={toggleCompare}
                      onClear={clearCompare}
                      onOpen={() => setCompareOpen(true)}
                      onShare={() => void shareCompare()}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </div>
          ) : (
            <>
              <DistroTable
                distros={filtered}
                highlight={activeHighlight}
                compare={compare}
                onToggleCompare={toggleCompare}
                onOpen={(d) => setSelectedId(d.id)}
              />
              <AnimatePresence>
                {compare.length > 0 && (
                  <motion.div
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 16, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-3 print:hidden"
                  >
                    <CompareTrayBar
                      compare={compare}
                      onToggle={toggleCompare}
                      onClear={clearCompare}
                      onOpen={() => setCompareOpen(true)}
                      onShare={() => void shareCompare()}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted-foreground/70 print:hidden">
            {viewMode === "graph"
              ? "Bubble size = popularity · colors = family · position = " +
                preset.label +
                " axes. Data is hand-curated and intentionally opinionated."
              : "Every column sorts — numbers high-to-low, names A-to-Z. Rows glow when they match your quiz. Export CSV grabs exactly what you see."}
          </p>
        </div>
      </div>

      <DistroDialog
        distro={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelectedId(null)}
        onNavigate={(d) => setSelectedId(d.id)}
        profile={profile ?? undefined}
      />
      <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} />
    </section>
  );
}
