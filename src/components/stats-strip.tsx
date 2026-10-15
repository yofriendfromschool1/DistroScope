"use client";

import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Activity, Sparkles, ThumbsUp, Trophy, Heart, TrendingUp, TrendingDown, Flame, Compass, Swords } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DISTROS, FAMILY_META } from "@/data/distros";
import type { DistroFamily } from "@/lib/types";
import type { StatsResponse } from "@/lib/types";

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const dayFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/**
 * Roving arrow-key navigation for a panel's clickable rows.
 * Left/Right move ±1; Up/Down move ±cols (for the 2-col grids).
 * Wraps in both directions; focuses the first row if nothing is focused.
 */
function arrowNav(cols = 1) {
  return (e: ReactKeyboardEvent<HTMLElement>) => {
    if (
      e.key !== "ArrowUp" &&
      e.key !== "ArrowDown" &&
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowRight"
    ) {
      return;
    }
    const container = e.currentTarget;
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button:not([disabled])")
    ).filter((b) => b.offsetParent !== null);
    if (buttons.length === 0) return;
    e.preventDefault();
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const vertical = e.key === "ArrowUp" || e.key === "ArrowDown";
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const step = vertical ? cols : 1;
    let next: number;
    if (idx === -1) {
      next = 0;
    } else {
      next = forward ? idx + step : idx - step;
      if (next < 0) next = buttons.length + next;
      if (next >= buttons.length) next -= buttons.length;
    }
    buttons[next]?.focus();
  };
}

function PulseTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { label: string; count: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="glass-strong rounded-xl border-white/15 px-3 py-2 text-xs shadow-[0_12px_40px_rgb(0_0_0/0.5)]">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {point.label}
      </p>
      <p className="mt-0.5 font-semibold text-foreground">
        {point.count} quiz{point.count === 1 ? "" : "zes"}
      </p>
    </div>
  );
}

function CommunityPulse({ daily }: { daily: { date: string; count: number }[] }) {
  const data = useMemo(
    () =>
      daily.map((d) => ({
        ...d,
        label: dayFmt.format(new Date(`${d.date}T00:00:00Z`)),
      })),
    [daily]
  );

  const { delta, hasActivity } = useMemo(() => {
    const last7 = daily.slice(-7).reduce((s, d) => s + d.count, 0);
    const prev7 = daily.slice(0, 7).reduce((s, d) => s + d.count, 0);
    const total = last7 + prev7;
    if (total === 0) return { delta: 0, hasActivity: false };
    const pct = prev7 === 0 ? 100 : Math.round(((last7 - prev7) / prev7) * 100);
    return { delta: pct, hasActivity: true };
  }, [daily]);

  const last7 = daily.slice(-7).reduce((s, d) => s + d.count, 0);

  if (!hasActivity) {
    return (
      <div className="glass mt-4 rounded-3xl border-white/5 p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-violet-300" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Community pulse
          </p>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          The activity chart lights up once quizzes start rolling in — the last
          fourteen days, day by day. Yours could be the first pixel.
        </p>
      </div>
    );
  }

  return (
    <div className="glass mt-4 rounded-3xl border-white/5 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Community pulse
          </p>
          <span className="text-[11px] text-muted-foreground/70">
            · quizzes per day, last 14 days
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-muted-foreground">
            {last7} this week
          </span>
          {delta !== 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold ${
                delta > 0
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                  : "border-rose-400/25 bg-rose-400/10 text-rose-300"
              }`}
            >
              {delta > 0 ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {delta > 0 ? "+" : ""}
              {delta}% vs last week
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 h-40 sm:h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.45} />
                <stop offset="55%" stopColor="#e879f9" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#e879f9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              interval={2}
              dy={6}
            />
            <YAxis
              allowDecimals={false}
              width={26}
              tick={{ fill: "rgba(255,255,255,0.32)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<PulseTooltip />}
              cursor={{ stroke: "rgba(232,121,249,0.35)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#c084fc"
              strokeWidth={2.5}
              fill="url(#pulseFill)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#e879f9",
                stroke: "rgba(255,255,255,0.85)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FamilyHeat({
  families,
  totalQuizzes,
}: {
  families: { family: string; count: number }[];
  totalQuizzes: number;
}) {
  if (families.length === 0) {
    return null;
  }
  const maxCount = Math.max(...families.map((f) => f.count), 1);
  const mapped = totalQuizzes || families.reduce((s, f) => s + f.count, 0) || 1;

  const filterByFamily = (family: string) => {
    window.dispatchEvent(
      new CustomEvent("distroscope:filter-family", { detail: family })
    );
  };

  return (
    <div className="glass mt-4 rounded-3xl border-white/5 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-orange-300" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Family heat
          </p>
          <span className="text-[11px] text-muted-foreground/70">
            · where the community’s matches land
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-muted-foreground/80">
          <Compass className="size-3" />
          click a family to filter the explorer
        </span>
      </div>

      <div
        className="mt-4 grid gap-2.5 sm:grid-cols-2"
        onKeyDown={arrowNav(2)}
        role="group"
        aria-label="Family results — use arrow keys to move between families"
      >
        {families.map((f) => {
          const meta = FAMILY_META[f.family as DistroFamily];
          const color = meta?.color ?? "#a78bfa";
          const share = Math.round((f.count / mapped) * 100);
          return (
            <button
              key={f.family}
              type="button"
              onClick={() => filterByFamily(f.family)}
              className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300/50"
              aria-label={`Filter the explorer to ${f.family}-family distros (${f.count} matches)`}
            >
              <span
                className="size-2.5 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-125"
                style={{
                  background: color,
                  boxShadow: `0 0 10px ${color}66`,
                }}
              />
              <span className="w-20 shrink-0 truncate text-xs font-medium sm:w-24">
                {f.family}
              </span>
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                <span
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(6, (f.count / maxCount) * 100)}%`,
                    background: `linear-gradient(to right, ${color}55, ${color})`,
                  }}
                />
              </span>
              <span className="w-14 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                {f.count} · {share}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TrendingThisWeek({ weekly }: { weekly: { name: string; count: number }[] }) {
  if (weekly.length === 0) return null;
  const max = Math.max(...weekly.map((w) => w.count), 1);
  const totalWeek = weekly.reduce((s, w) => s + w.count, 0);

  const open = (name: string) => {
    const id = DISTROS.find((d) => d.name === name)?.id;
    if (id) {
      window.dispatchEvent(
        new CustomEvent("distroscope:open-distro", { detail: id })
      );
    }
  };

  return (
    <div className="glass mt-4 rounded-3xl border-white/5 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
          </span>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Trending this week
          </p>
          <span className="text-[11px] text-muted-foreground/70">
            · hottest matches over the last 7 days
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {totalWeek} quiz{totalWeek === 1 ? "" : "zes"} in 7 days
        </span>
      </div>

      <div
        className="mt-4 flex flex-wrap gap-2.5"
        onKeyDown={arrowNav(1)}
        role="group"
        aria-label="Trending distros — use arrow keys to move between them"
      >
        {weekly.map((w, i) => {
          const d = DISTROS.find((x) => x.name === w.name);
          const color = d?.color ?? "#a78bfa";
          const share = Math.round((w.count / max) * 100);
          return (
            <button
              key={w.name}
              type="button"
              onClick={() => open(w.name)}
              className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-3 pr-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300/50"
              aria-label={`${w.name} — matched ${w.count} times this week. Open its card.`}
              title={`${w.name} · ${w.count} match${w.count === 1 ? "" : "es"} this week — click to open`}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 origin-bottom bg-gradient-to-t opacity-25 transition-opacity duration-300 group-hover:opacity-40"
                style={{
                  width: `${Math.max(12, share)}%`,
                  background: `linear-gradient(to top, ${color}, transparent)`,
                }}
              />
              <span className="relative font-mono text-[10px] font-bold text-muted-foreground/70">
                #{i + 1}
              </span>
              <span
                className="relative size-2.5 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-125"
                style={{ background: color, boxShadow: `0 0 10px ${color}66` }}
              />
              <span className="relative text-xs font-semibold">{w.name}</span>
              <span className="relative font-mono text-[10px] text-muted-foreground">
                ×{w.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DuelArena({ compared }: { compared: { ids: string[]; count: number }[] }) {
  if (compared.length === 0) {
    return (
      <div className="glass mt-4 rounded-3xl border-white/5 p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <Swords className="size-4 text-rose-300" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Duel arena
          </p>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Nobody has drawn swords yet. Compare two or three distros in the
          explorer and the community’s favorite matchups will appear here.
        </p>
      </div>
    );
  }

  const max = Math.max(...compared.map((c) => c.count), 1);

  const open = (ids: string[]) => {
    window.dispatchEvent(
      new CustomEvent("distroscope:open-compare", { detail: ids })
    );
  };

  return (
    <div className="glass mt-4 rounded-3xl border-white/5 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Swords className="size-4 text-rose-300" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Duel arena
          </p>
          <span className="text-[11px] text-muted-foreground/70">
            · the matchups the community keeps replaying
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-muted-foreground/80">
          <Swords className="size-3" />
          click a duel to load it into the tray
        </span>
      </div>

      <div
        className="mt-4 grid gap-2.5 sm:grid-cols-2"
        onKeyDown={arrowNav(2)}
        role="group"
        aria-label="Community duels — use arrow keys to move between matchups"
      >
        {compared.map((c) => {
          const distros = c.ids
            .map((id) => DISTROS.find((d) => d.id === id))
            .filter((d): d is NonNullable<typeof d> => Boolean(d));
          if (distros.length < 2) return null;
          const share = Math.round((c.count / max) * 100);
          const label = distros.map((d) => d.name).join(" vs ");
          return (
            <button
              key={c.ids.join(",")}
              type="button"
              onClick={() => open(c.ids)}
              className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300/50"
              aria-label={`Load comparison ${label} into the tray — compared ${c.count} times`}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/[0.04] to-transparent"
                style={{ width: `${Math.max(14, share)}%` }}
              />
              <span className="relative flex shrink-0 items-center">
                {distros.map((d, i) => (
                  <span key={d.id} className="flex items-center">
                    {i > 0 && (
                      <span className="mx-1 font-mono text-[9px] text-muted-foreground/60">
                        vs
                      </span>
                    )}
                    <span
                      className="grid size-6 place-items-center rounded-lg font-mono text-[9px] font-bold"
                      style={{
                        background: `${d.color}22`,
                        color: d.color,
                        boxShadow: `inset 0 0 0 1px ${d.color}44`,
                      }}
                    >
                      {d.initials}
                    </span>
                  </span>
                ))}
              </span>
              <span className="relative min-w-0 flex-1 truncate text-xs font-medium">
                {label}
              </span>
              <span className="relative shrink-0 font-mono text-[11px] text-muted-foreground">
                ×{c.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StatsStrip() {
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/stats")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
        .then((d: StatsResponse) => {
          if (!cancelled) setStats(d);
        })
        .catch(() => {});
    };
    load();
    window.addEventListener("distroscope:quiz-done", load);
    window.addEventListener("distroscope:feedback-given", load);
    window.addEventListener("distroscope:compare-recorded", load);
    return () => {
      cancelled = true;
      window.removeEventListener("distroscope:quiz-done", load);
      window.removeEventListener("distroscope:feedback-given", load);
      window.removeEventListener("distroscope:compare-recorded", load);
    };
  }, []);

  const total = stats?.totalQuizzes ?? 0;
  const count = useCountUp(total);
  const top = stats?.topMatches?.[0];
  const topCount = top?.count ?? 0;
  const maxCount = stats?.topMatches?.[0]?.count ?? 1;
  const runnersUp = stats?.topMatches?.slice(1, 4) ?? [];
  const favorite = stats?.favorite ?? null;
  const favVotes = favorite ? favorite.up + favorite.down : 0;
  const favRatio = favorite ? Math.round((favorite.up / favVotes) * 100) : 0;
  const daily = stats?.daily ?? [];
  const families = stats?.families ?? [];
  const weekly = stats?.weekly ?? [];
  const compared = stats?.compared ?? [];

  return (
    <section
      id="stats"
      className="relative mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-10 sm:px-6 print:hidden"
    >
      <div className="glass grid overflow-hidden rounded-3xl border-white/5 sm:grid-cols-2 lg:grid-cols-4">
        {/* quizzes taken */}
        <div className="flex items-center gap-4 border-white/5 p-6 transition-colors duration-300 hover:bg-white/[0.03] sm:border-r sm:border-b sm:p-7 lg:border-b-0">
          <span className="glass-soft grid size-11 shrink-0 place-items-center rounded-2xl">
            <Activity className="size-5 text-violet-300" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-3xl font-semibold tracking-tight">
              {count.toLocaleString()}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              quizzes taken and counting
            </p>
          </div>
        </div>

        {/* top match */}
        <div className="flex items-center gap-4 border-white/5 p-6 transition-colors duration-300 hover:bg-white/[0.03] sm:border-b sm:p-7 lg:border-b-0">
          <span className="glass-soft grid size-11 shrink-0 place-items-center rounded-2xl">
            <Trophy className="size-5 text-amber-300" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold tracking-tight">
              {top ? top.name : "Awaiting results"}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {top
                ? `matched ${topCount.toLocaleString()} time${topCount === 1 ? "" : "s"} — the crowd favorite`
                : "be the first to take the quiz"}
            </p>
          </div>
        </div>

        {/* community verdict (feedback) */}
        <div className="flex items-center gap-4 border-white/5 p-6 transition-colors duration-300 hover:bg-white/[0.03] sm:border-r sm:p-7">
          <span className="glass-soft grid size-11 shrink-0 place-items-center rounded-2xl">
            <Heart className="size-5 text-rose-300" />
          </span>
          <div className="min-w-0 flex-1">
            {favorite ? (
              <>
                <p className="flex items-center gap-2 truncate text-xl font-semibold tracking-tight">
                  {favorite.name}
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                    <ThumbsUp className="size-2.5" />
                    {favRatio}%
                  </span>
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  loved by {favorite.up}/{favVotes} matchers — community verdict
                </p>
                <div className="mt-2 h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400/80 to-teal-300/80 transition-all duration-1000"
                    style={{ width: `${Math.max(8, favRatio)}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="truncate text-xl font-semibold tracking-tight text-muted-foreground">
                  No verdict yet
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  thumbs-up your match to weigh in
                </p>
              </>
            )}
          </div>
        </div>

        {/* trending */}
        <div className="p-6 transition-colors duration-300 hover:bg-white/[0.03] sm:p-7">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-fuchsia-300" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Top matches
            </p>
          </div>
          {runnersUp.length > 0 ? (
            <div className="mt-4 space-y-2.5">
              {runnersUp.map((m) => (
                <div key={m.name} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-xs font-medium sm:w-28">
                    {m.name}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-1000"
                      style={{
                        width: `${Math.max(6, (m.count / maxCount) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                    {m.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Live results appear here as the community takes the quiz. Your
              answers stay anonymous.
            </p>
          )}
        </div>
      </div>

      {/* activity chart — second row */}
      {daily.length > 0 && <CommunityPulse daily={daily} />}

      {/* family heat — third row, clickable → filters the explorer */}
      <FamilyHeat families={families} totalQuizzes={total} />

      {/* trending this week — fourth row, clickable → opens the distro card */}
      <TrendingThisWeek weekly={weekly} />

      {/* duel arena — fifth row, clickable → loads the pair into the compare tray */}
      <DuelArena compared={compared} />
    </section>
  );
}
