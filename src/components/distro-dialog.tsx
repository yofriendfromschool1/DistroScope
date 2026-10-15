"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { ArrowRight, BadgeCheck, ExternalLink, GitCompare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FAMILY_META, USE_CASE_LABELS } from "@/data/distros";
import { closestDistros } from "@/lib/similarity";
import { useDistroScope } from "@/lib/store";
import type { Distro, ScoreKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const DIFFICULTY_LABELS = [
  "Absolute beginner",
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
];

const GOVERNANCE_LABELS: Record<Distro["governance"], string> = {
  community: "Community project",
  corporate: "Corporate-backed",
  independent: "Independent team",
};

const AI_POSTURE_LABELS: Record<Distro["aiPolicy"], string> = {
  reviewed: "Human-reviewed — AI-assisted work must be disclosed & signed off",
  permissive: "No published AI policy — contributions judged on merit",
  embracing: "AI-forward — actively ships AI tooling & ML stacks",
};

const RADAR_TRAITS: { key: keyof Distro["scores"]; label: string }[] = [
  { key: "easeOfUse", label: "Ease" },
  { key: "customizability", label: "Control" },
  { key: "performance", label: "Speed" },
  { key: "outOfBox", label: "Ready" },
  { key: "stability", label: "Stable" },
  { key: "freshness", label: "Fresh" },
  { key: "privacyFocus", label: "Private" },
  { key: "gamingSupport", label: "Gaming" },
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-soft relative overflow-hidden rounded-xl px-3 py-2.5 transition-all duration-300 hover:border-white/[0.14] card-sweep">
      <p className="text-[10px] font-medium uppercase tracking-[0.09em] text-muted-foreground/80">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-medium leading-snug break-words text-foreground/95">
        {value}
      </p>
    </div>
  );
}

export function DistroDialog({
  distro,
  open,
  onOpenChange,
  onNavigate,
  profile,
}: {
  distro: Distro | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** jump to another distro from within the dialog (cousins) */
  onNavigate?: (distro: Distro) => void;
  /** quiz-taker's trait vector — when present the radar overlays "You" */
  profile?: Partial<Record<ScoreKey, number>>;
}) {
  const compare = useDistroScope((s) => s.compare);
  const toggleCompare = useDistroScope((s) => s.toggleCompare);

  const cousins = useMemo(
    () => (distro ? closestDistros(distro, 3) : []),
    [distro]
  );

  if (!distro) return null;

  const inCompare = compare.includes(distro.id);
  const hasProfile = !!profile && Object.keys(profile).length > 0;
  const radarData = RADAR_TRAITS.map((t) => ({
    trait: t.label,
    value: distro.scores[t.key],
    ...(hasProfile ? { you: profile?.[t.key] ?? 50 } : {}),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[88vh] overflow-y-auto rounded-3xl p-0 scrollbar-slim sm:max-w-2xl">
        <div className="p-6 sm:p-7">
          <DialogHeader className="text-left">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-2xl font-mono text-sm font-bold text-white"
                  style={{
                    background: `radial-gradient(circle at 32% 30%, ${distro.color}e6, ${distro.color}55)`,
                    border: `1px solid ${distro.color}77`,
                    boxShadow: `0 0 28px ${distro.color}33`,
                  }}
                >
                  {distro.initials}
                </span>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight">
                    {distro.name}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-[13px]">
                    {distro.tagline}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {distro.active && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
                    <BadgeCheck className="size-3" />
                    Active
                  </span>
                )}
              </div>
            </div>
          </DialogHeader>

          <p className="mt-5 text-pretty text-sm leading-relaxed text-muted-foreground">
            {distro.description}
          </p>

          {/* stats + radar */}
          <div className="mt-7 grid items-start gap-5 sm:grid-cols-[1fr_1fr]">
            <div className="glass-soft rounded-2xl p-3">
              <p className="flex items-center gap-1.5 px-1 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.09em] text-muted-foreground/80">
                {hasProfile ? "You vs this distro" : "Trait profile"}
                <span className="ml-auto font-mono text-[9px] normal-case tracking-normal text-muted-foreground/60">
                  0–100
                </span>
              </p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                    <PolarGrid stroke="rgba(255,255,255,0.09)" />
                    <PolarAngleAxis
                      dataKey="trait"
                      tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={false}
                      axisLine={false}
                    />
                    {hasProfile && (
                      <Radar
                        name="You"
                        dataKey="you"
                        stroke="#e879f9"
                        fill="#c084fc"
                        fillOpacity={0.24}
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={{ r: 2.5, fill: "#e879f9", strokeWidth: 0 }}
                      />
                    )}
                    <Radar
                      dataKey="value"
                      stroke={distro.color}
                      fill={distro.color}
                      fillOpacity={0.28}
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: distro.color, strokeWidth: 0 }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {hasProfile && (
                <div className="flex flex-wrap items-center justify-center gap-4 px-1 pb-1 pt-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span
                      className="size-2.5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400"
                      style={{ boxShadow: "0 0 8px rgba(232,121,249,0.5)" }}
                    />
                    You — dashed
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span
                      className="size-2.5 rounded-full"
                      style={{
                        background: distro.color,
                        boxShadow: `0 0 8px ${distro.color}88`,
                      }}
                    />
                    {distro.name}
                  </span>
                </div>
              )}
            </div>

            <div className="grid content-start grid-cols-2 gap-2 self-start">
              <Stat label="Family" value={distro.family} />
              <Stat
                label="Based on"
                value={distro.basedOn ?? "Independent"}
              />
              <Stat
                label="Package manager"
                value={distro.packageManager}
              />
              <Stat
                label="Releases"
                value={
                  distro.releaseModel === "rolling" ? "Rolling" : "Point"
                }
              />
              <Stat
                label="Comfortable RAM"
                value={`${distro.ramMin} MB+`}
              />
              <Stat
                label="Difficulty"
                value={DIFFICULTY_LABELS[distro.difficulty - 1]}
              />
              <Stat
                label="Init system"
                value={
                  distro.initSystem === "other"
                    ? (distro.initNote ?? "custom init")
                    : distro.initSystem
                }
              />
              <Stat
                label="Stewardship"
                value={GOVERNANCE_LABELS[distro.governance]}
              />
              <div className="col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="glass-soft rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.09em] text-muted-foreground/80">
                    Desktops
                  </p>
                  <p className="mt-1 text-[13.5px] font-medium text-foreground/95">
                    {distro.desktops.length > 0
                      ? distro.desktops.join(", ")
                      : "Headless / server"}
                  </p>
                </div>
                <div
                  className={`glass-soft rounded-xl px-3 py-2.5 ${
                    distro.initSystem !== "systemd"
                      ? "border border-amber-200/20"
                      : ""
                  }`}
                  title={distro.initNote ?? undefined}
                >
                  <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.09em] text-muted-foreground/80">
                    Init note
                    {distro.initSystem !== "systemd" && (
                      <span className="size-1.5 rounded-full bg-amber-300/80 shadow-[0_0_6px_rgb(252_211_77/0.6)]" />
                    )}
                  </p>
                  <p className="mt-1 text-[13px] font-medium leading-snug text-foreground/90">
                    {distro.initNote ??
                      (distro.initSystem === "systemd"
                        ? "Standard systemd boot"
                        : "Alternative init as PID 1")}
                  </p>
                </div>
                {/* AI posture — feeds the aipolicy quiz dimension */}
                <div
                  className="glass-soft col-span-2 rounded-xl px-3 py-2.5"
                  title="Public posture toward AI-generated contributions & tooling — evolves fast, we track the public stance"
                >
                  <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.09em] text-muted-foreground/80">
                    AI posture
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        distro.aiPolicy === "embracing"
                          ? "bg-fuchsia-300/80 shadow-[0_0_6px_rgb(232_121_249/0.5)]"
                          : distro.aiPolicy === "reviewed"
                            ? "bg-emerald-300/80 shadow-[0_0_6px_rgb(110_231_183/0.6)]"
                            : "bg-white/30"
                      )}
                    />
                  </p>
                  <p className="mt-1 text-[13px] font-medium leading-snug text-foreground/90">
                    {AI_POSTURE_LABELS[distro.aiPolicy]}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* pros & cons */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="glass-soft rounded-2xl p-4">
              <p className="text-xs font-semibold text-emerald-300">
                Strengths
              </p>
              <ul className="mt-2.5 space-y-2">
                {distro.pros.map((pro) => (
                  <li
                    key={pro}
                    className="flex items-start gap-2 text-[13px] leading-snug text-muted-foreground"
                  >
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-emerald-400/15">
                      <svg viewBox="0 0 12 12" className="size-2.5 text-emerald-300">
                        <path
                          d="M2 6.5 4.5 9 10 3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-soft rounded-2xl p-4">
              <p className="text-xs font-semibold text-rose-300">
                Trade-offs
              </p>
              <ul className="mt-2.5 space-y-2">
                {distro.cons.map((con) => (
                  <li
                    key={con}
                    className="flex items-start gap-2 text-[13px] leading-snug text-muted-foreground"
                  >
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-rose-400/15">
                      <svg viewBox="0 0 12 12" className="size-2.5 text-rose-300">
                        <path
                          d="M3 3l6 6M9 3l-6 6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* use cases */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            {distro.useCases.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
              >
                {USE_CASE_LABELS[tag] ?? tag}
              </span>
            ))}
          </div>

          {/* closest cousins — nearest distros across all 17 traits */}
          {cousins.length > 0 && (
            <div className="mt-6">
              <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.09em] text-muted-foreground/80">
                <Users className="size-3 text-fuchsia-300" />
                Closest cousins
                <span className="ml-1 font-mono text-[9px] normal-case tracking-normal text-muted-foreground/60">
                  · nearest by all 17 traits
                </span>
              </p>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                {cousins.map((c) => (
                  <button
                    key={c.distro.id}
                    type="button"
                    onClick={() => onNavigate?.(c.distro)}
                    disabled={!onNavigate}
                    className="glass-soft group flex items-center gap-2.5 rounded-xl p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-fuchsia-300/30 hover:bg-white/[0.07] disabled:pointer-events-none disabled:opacity-60"
                    aria-label={`Show ${c.distro.name} — ${c.similarity}% trait similarity`}
                  >
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-lg font-mono text-[10px] font-bold"
                      style={{
                        background: `${c.distro.color}22`,
                        color: c.distro.color,
                        boxShadow: `inset 0 0 0 1px ${c.distro.color}40`,
                      }}
                    >
                      {c.distro.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">
                        {c.distro.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                        {c.similarity}% alike
                      </span>
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-fuchsia-300" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* actions */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Button
              asChild
              className="h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 text-[13px] font-medium shadow-[0_6px_24px_rgb(192_132_252/0.35)] hover:brightness-110"
            >
              <a href={distro.website} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                Visit website
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={() => toggleCompare(distro.id)}
              className={cn(
                "glass h-10 rounded-xl border-white/10 px-4 text-[13px] font-medium",
                inCompare && "border-fuchsia-300/40 bg-fuchsia-400/15 text-fuchsia-100"
              )}
            >
              <GitCompare className="size-4" />
              {inCompare ? "In compare tray" : "Add to compare"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
