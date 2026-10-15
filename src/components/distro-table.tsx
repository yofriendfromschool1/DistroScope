"use client";

import type { CSSProperties } from "react";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  ExternalLink,
  GitCompare,
  TriangleAlert,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DISTROS } from "@/data/distros";
import type { Distro, ScoreKey } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey =
  | "name"
  | "family"
  | "ramMin"
  | "difficulty"
  | "initSystem"
  | "popularity"
  | ScoreKey;

interface SortSpec {
  key: SortKey;
  label: string;
  className?: string;
}

const SORT_SPECS: SortSpec[] = [
  { key: "name", label: "Distro", className: "min-w-[180px]" },
  { key: "family", label: "Family", className: "hidden md:table-cell" },
  { key: "ramMin", label: "RAM", className: "text-right" },
  { key: "difficulty", label: "Level" },
  {
    key: "initSystem",
    label: "Init",
    className: "hidden xl:table-cell",
  },
  {
    key: "easeOfUse",
    label: "Ease",
    className: "hidden sm:table-cell text-right",
  },
  {
    key: "performance",
    label: "Speed",
    className: "hidden sm:table-cell text-right",
  },
  {
    key: "gamingSupport",
    label: "Gaming",
    className: "hidden lg:table-cell text-right",
  },
  {
    key: "privacyFocus",
    label: "Privacy",
    className: "hidden lg:table-cell text-right",
  },
  { key: "popularity", label: "Popularity", className: "text-right" },
];

/** columns users can hide — name and actions are always shown */
const OPTIONAL_COLUMN_KEYS = SORT_SPECS.filter(
  (s) => s.key !== "name"
).map((s) => s.key as string);

const COLS_STORAGE_KEY = "distroscope:cols";

/** one-click column presets shown above the checkbox list */
const COLUMN_PRESETS: { id: string; label: string; keys: string[] }[] = [
  {
    id: "compact",
    label: "Compact",
    keys: ["family", "ramMin", "difficulty", "popularity"],
  },
  {
    id: "standard",
    label: "Standard",
    keys: [
      "family",
      "ramMin",
      "difficulty",
      "easeOfUse",
      "performance",
      "popularity",
      "privacyFocus",
    ],
  },
  {
    id: "all",
    label: "Everything",
    keys: [...OPTIONAL_COLUMN_KEYS],
  },
];

function matchingPreset(visible: ReadonlySet<string>): string | null {
  for (const preset of COLUMN_PRESETS) {
    if (
      preset.keys.length === visible.size &&
      preset.keys.every((k) => visible.has(k))
    ) {
      return preset.id;
    }
  }
  return null;
}

function loadVisibleColumns(): Set<string> {
  try {
    const raw = window.localStorage.getItem(COLS_STORAGE_KEY);
    if (!raw) return new Set(OPTIONAL_COLUMN_KEYS);
    const saved = JSON.parse(raw) as string[];
    if (!Array.isArray(saved)) return new Set(OPTIONAL_COLUMN_KEYS);
    // keep only known keys, but remember explicitly-hidden ones
    const kept = saved.filter((k) => OPTIONAL_COLUMN_KEYS.includes(k));
    return kept.length > 0 ? new Set(kept) : new Set();
  } catch {
    return new Set(OPTIONAL_COLUMN_KEYS);
  }
}

// ── Persisted columns, hydration-safe ─────────────────────────
// Same useSyncExternalStore pattern as the view-mode pref: the server
// snapshot is the default column set (matching SSR), and the saved set takes
// over after mount — no hydration mismatch, no setState-in-effect.

let cachedColsRaw: string | null | undefined;
let cachedColsSet: ReadonlySet<string> | undefined;

function subscribeCols(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getColsSnapshot(): ReadonlySet<string> {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(COLS_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedColsRaw || cachedColsSet === undefined) {
    cachedColsRaw = raw;
    cachedColsSet = loadVisibleColumns();
  }
  return cachedColsSet;
}

function getServerColsSnapshot(): ReadonlySet<string> {
  return new Set(OPTIONAL_COLUMN_KEYS);
}

function getSortValue(d: Distro, key: SortKey): string | number {
  switch (key) {
    case "name":
      return d.name.toLowerCase();
    case "family":
      return d.family;
    case "ramMin":
      return d.ramMin;
    case "difficulty":
      return d.difficulty;
    case "initSystem":
      return d.initSystem;
    case "popularity":
      return d.popularity;
    default:
      return d.scores[key];
  }
}

function DifficultyDots({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Difficulty ${level} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full",
            i < level ? "bg-fuchsia-400" : "bg-white/15"
          )}
        />
      ))}
    </span>
  );
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-white/[0.07] xl:block">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}66, ${color})`,
          }}
        />
      </span>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {value}
      </span>
    </span>
  );
}

export function DistroTable({
  distros,
  highlight,
  compare,
  onToggleCompare,
  onOpen,
}: {
  distros: Distro[];
  highlight: string[];
  compare: string[];
  onToggleCompare: (id: string) => void;
  onOpen: (distro: Distro) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("popularity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // Hydration-safe columns: SSR renders the defaults; after mount the saved
  // column chooser takes over until the user changes something this session.
  const storedCols = useSyncExternalStore(
    subscribeCols,
    getColsSnapshot,
    getServerColsSnapshot
  );
  const [colsOverride, setColsOverride] = useState<ReadonlySet<string> | null>(
    null
  );
  const visibleCols = colsOverride ?? storedCols;

  useEffect(() => {
    if (colsOverride === null) return;
    try {
      window.localStorage.setItem(
        COLS_STORAGE_KEY,
        JSON.stringify([...colsOverride])
      );
    } catch {
      // non-critical
    }
  }, [colsOverride]);

  const toggleColumn = (key: string) => {
    setColsOverride((prev) => {
      const base = prev ?? getColsSnapshot();
      const next = new Set(base);
      if (next.has(key)) {
        // don't allow hiding every optional column
        if (next.size <= 1) return prev ?? base;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const activeSpecs = useMemo(
    () =>
      SORT_SPECS.filter(
        (spec) => spec.key === "name" || visibleCols.has(spec.key as string)
      ),
    [visibleCols]
  );

  const sorted = useMemo(() => {
    const list = [...distros];
    list.sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [distros, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "family" ? "asc" : "desc");
    }
  };

  if (distros.length === 0) {
    return (
      <div className="glass grid min-h-[340px] place-items-center rounded-3xl">
        <div className="glass-soft flex items-center gap-3 rounded-2xl px-6 py-5">
          <TriangleAlert className="size-5 text-amber-300" />
          <div>
            <p className="text-sm font-medium">No distros match these filters</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Even Tux has limits — try loosening them.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden rounded-3xl p-2.5 sm:p-4 print:overflow-visible print:rounded-none print:border-white/10 print:p-0">
      <div className="flex min-h-8 items-center justify-between gap-2 px-2 pb-2 pt-1.5 print:hidden">
        <p className="text-xs text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">
            {distros.length}
          </span>{" "}
          of {DISTROS.length} distros — click a column to sort
        </p>
        <div className="flex items-center gap-2">
          {highlight.length > 0 && (
            <span className="glass-soft hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-fuchsia-200 sm:flex">
              <span className="size-1.5 animate-pulse-soft rounded-full bg-fuchsia-400" />
              Your quiz matches
            </span>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="glass-soft h-8 gap-1.5 rounded-lg border-white/10 px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground"
                aria-label="Choose table columns"
              >
                <Columns3 className="size-3.5" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="glass-strong w-56 rounded-2xl border-white/15 p-3"
            >
              <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Presets
              </p>
              <div className="grid grid-cols-3 gap-1.5 pb-3">
                {COLUMN_PRESETS.map((preset) => {
                  const active =
                    matchingPreset(visibleCols) === preset.id;
                  return (
                    <Button
                      key={preset.id}
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() =>
                        setColsOverride(new Set(preset.keys))
                      }
                      aria-pressed={active}
                      className={cn(
                        "h-7 rounded-lg px-1.5 text-[11px] font-medium transition-all",
                        active
                          ? "border-fuchsia-400/50 bg-fuchsia-500/15 text-fuchsia-200"
                          : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/10 hover:text-foreground"
                      )}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
              <div className="border-t border-white/10 pt-2">
                <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Visible columns
                </p>
              <div className="space-y-1">
                {SORT_SPECS.filter((s) => s.key !== "name").map((spec) => {
                  const checked = visibleCols.has(spec.key as string);
                  return (
                    <label
                      key={spec.key}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-white/[0.06]"
                    >
                      <span
                        className={cn(
                          "transition-colors",
                          checked ? "text-foreground/90" : "text-muted-foreground"
                        )}
                      >
                        {spec.label}
                      </span>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleColumn(spec.key as string)}
                        className="border-white/20 data-[state=checked]:border-fuchsia-400 data-[state=checked]:bg-fuchsia-500/70"
                        aria-label={`Show ${spec.label} column`}
                      />
                    </label>
                  );
                })}
              </div>
              </div>
              <p className="mt-2 border-t border-white/10 px-1 pt-2 text-[10px] leading-relaxed text-muted-foreground/70">
                Presets and picks are saved to this browser. At least one
                column stays on.
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="max-h-[68vh] overflow-auto rounded-2xl border border-white/5 print:max-h-none print:overflow-visible print:border-white/10 [&>div]:!overflow-visible">
        <Table className="border-separate border-spacing-0">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {activeSpecs.map((spec) => {
                const active = sortKey === spec.key;
                return (
                  <TableHead
                    key={spec.key}
                    className={cn(
                      "sticky top-0 z-20 h-10 whitespace-nowrap bg-[#171322]/95 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-xl after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/10 print:bg-white print:text-black print:backdrop-blur-none",
                      active
                        ? "text-fuchsia-200"
                        : "text-muted-foreground",
                      spec.className
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(spec.key)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                      aria-label={`Sort by ${spec.label}`}
                    >
                      {spec.label}
                      {active ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </button>
                  </TableHead>
                );
              })}
              <TableHead className="sticky top-0 z-20 h-10 bg-[#171322]/95 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-xl after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/10 print:hidden">
                <span className="sr-only sm:not-sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((d) => {
              const highlighted = highlight.includes(d.id);
              const inCompare = compare.includes(d.id);
              return (
                <TableRow
                  key={d.id}
                  onClick={() => onOpen(d)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen(d);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`Open ${d.name} details`}
                  style={{ "--accent": `${d.color}cc` } as CSSProperties}
                  className={cn(
                    "group cursor-pointer transition-colors hover:bg-white/[0.05] hover:shadow-[inset_2.5px_0_0_0_var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fuchsia-300/50",
                    highlighted && "bg-fuchsia-400/[0.06] hover:bg-fuchsia-400/[0.1]"
                  )}
                >
                  {activeSpecs.map((spec) => {
                    switch (spec.key) {
                      case "name":
                        return (
                          <TableCell
                            key="name"
                            className="whitespace-nowrap border-b border-white/[0.04] py-3.5"
                          >
                            <span className="flex items-center gap-2.5">
                              <span
                                className="grid size-7 shrink-0 place-items-center rounded-lg font-mono text-[10px] font-bold text-white"
                                style={{
                                  background: `radial-gradient(circle at 32% 30%, ${d.color}e6, ${d.color}55)`,
                                  border: `1px solid ${d.color}77`,
                                  boxShadow: highlighted
                                    ? `0 0 14px ${d.color}88`
                                    : undefined,
                                }}
                              >
                                {d.initials}
                              </span>
                              <span className="min-w-0">
                                <span className="flex items-center gap-2">
                                  <span className="text-[13px] font-semibold">
                                    {d.name}
                                  </span>
                                  {highlighted && (
                                    <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fuchsia-200">
                                      match
                                    </span>
                                  )}
                                </span>
                                <span className="mt-0.5 hidden max-w-[240px] truncate text-[11px] text-muted-foreground lg:block">
                                  {d.tagline}
                                </span>
                              </span>
                            </span>
                          </TableCell>
                        );
                      case "family":
                        return (
                          <TableCell
                            key="family"
                            className="hidden whitespace-nowrap border-b border-white/[0.04] text-[13px] text-muted-foreground md:table-cell"
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ background: d.color }}
                              />
                              {d.family}
                            </span>
                          </TableCell>
                        );
                      case "ramMin":
                        return (
                          <TableCell
                            key="ramMin"
                            className="whitespace-nowrap border-b border-white/[0.04] text-right font-mono text-xs tabular-nums text-muted-foreground"
                          >
                            {d.ramMin} MB
                          </TableCell>
                        );
                      case "difficulty":
                        return (
                          <TableCell
                            key="difficulty"
                            className="border-b border-white/[0.04]"
                          >
                            <DifficultyDots level={d.difficulty} />
                          </TableCell>
                        );
                      case "initSystem":
                        return (
                          <TableCell
                            key="initSystem"
                            className="hidden whitespace-nowrap border-b border-white/[0.04] text-[12.5px] xl:table-cell"
                          >
                            <span
                              className={cn(
                                "font-mono",
                                d.initSystem !== "systemd"
                                  ? "font-semibold text-amber-200"
                                  : "text-muted-foreground"
                              )}
                              title={d.initNote ?? undefined}
                            >
                              {d.initSystem === "other"
                                ? (d.initNote ?? "custom")
                                : d.initSystem}
                            </span>
                          </TableCell>
                        );
                      case "easeOfUse":
                        return (
                          <TableCell
                            key="easeOfUse"
                            className="hidden border-b border-white/[0.04] text-right sm:table-cell"
                          >
                            <ScoreBar value={d.scores.easeOfUse} color={d.color} />
                          </TableCell>
                        );
                      case "performance":
                        return (
                          <TableCell
                            key="performance"
                            className="hidden border-b border-white/[0.04] text-right sm:table-cell"
                          >
                            <ScoreBar value={d.scores.performance} color={d.color} />
                          </TableCell>
                        );
                      case "gamingSupport":
                        return (
                          <TableCell
                            key="gamingSupport"
                            className="hidden border-b border-white/[0.04] text-right lg:table-cell"
                          >
                            <ScoreBar value={d.scores.gamingSupport} color={d.color} />
                          </TableCell>
                        );
                      case "privacyFocus":
                        return (
                          <TableCell
                            key="privacyFocus"
                            className="hidden border-b border-white/[0.04] text-right lg:table-cell"
                          >
                            <ScoreBar value={d.scores.privacyFocus} color={d.color} />
                          </TableCell>
                        );
                      case "popularity":
                        return (
                          <TableCell
                            key="popularity"
                            className="border-b border-white/[0.04] text-right"
                          >
                            <ScoreBar value={d.popularity} color={d.color} />
                          </TableCell>
                        );
                      default:
                        return null;
                    }
                  })}
                  <TableCell className="border-b border-white/[0.04] text-right print:hidden">
                    <span className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCompare(d.id);
                        }}
                        className={cn(
                          "grid size-7 place-items-center rounded-lg border border-white/10 bg-white/[0.03] transition-all hover:bg-white/10",
                          inCompare
                            ? "text-fuchsia-200"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        aria-label={`Toggle ${d.name} in compare tray`}
                      >
                        <GitCompare className="size-3.5" />
                      </button>
                      <a
                        href={d.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="grid size-7 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground"
                        aria-label={`Visit ${d.name} website`}
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
