"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { X } from "lucide-react";
import { DISTROS } from "@/data/distros";
import { useDistroScope } from "@/lib/store";
import type { Distro, ScoreKey } from "@/lib/types";

const COMPARE_SCORES: { key: ScoreKey; label: string }[] = [
  { key: "easeOfUse", label: "Ease of use" },
  { key: "performance", label: "Performance" },
  { key: "outOfBox", label: "Out of box" },
  { key: "stability", label: "Stability" },
  { key: "freshness", label: "Freshness" },
  { key: "gamingSupport", label: "Gaming" },
  { key: "privacyFocus", label: "Privacy" },
];

const RADAR_TRAITS: { key: ScoreKey; label: string }[] = [
  { key: "easeOfUse", label: "Ease" },
  { key: "customizability", label: "Control" },
  { key: "performance", label: "Speed" },
  { key: "outOfBox", label: "Ready" },
  { key: "stability", label: "Stable" },
  { key: "freshness", label: "Fresh" },
  { key: "gamingSupport", label: "Gaming" },
  { key: "privacyFocus", label: "Private" },
];

function DifficultyDots({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={
            i < level
              ? "size-1.5 rounded-full bg-fuchsia-400"
              : "size-1.5 rounded-full bg-white/15"
          }
        />
      ))}
    </span>
  );
}

export function CompareDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const compare = useDistroScope((s) => s.compare);
  const toggleCompare = useDistroScope((s) => s.toggleCompare);

  const distros = compare
    .map((id) => DISTROS.find((d) => d.id === id))
    .filter((d): d is Distro => Boolean(d));

  if (distros.length === 0) return null;

  const radarData = RADAR_TRAITS.map((t) => {
    const row: Record<string, string | number> = { trait: t.label };
    for (const d of distros) row[d.id] = d.scores[t.key];
    return row;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[88vh] overflow-y-auto rounded-3xl p-0 scrollbar-slim sm:max-w-3xl">
        <div className="p-6 sm:p-7">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold tracking-tight">
              Side by side
            </DialogTitle>
            <DialogDescription>
              {distros.map((d) => d.name).join(" vs ")} — the numbers that
              matter.
            </DialogDescription>
          </DialogHeader>

          {/* radar overlay */}
          <div className="glass-soft mt-5 rounded-2xl p-4">
            <p className="px-1 pb-1 pt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Trait overlay
            </p>
            <div className="h-60 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="74%">
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
                  {distros.map((d) => (
                    <Radar
                      key={d.id}
                      name={d.name}
                      dataKey={d.id}
                      stroke={d.color}
                      fill={d.color}
                      fillOpacity={0.14}
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: d.color, strokeWidth: 0 }}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pb-1">
              {distros.map((d) => (
                <span
                  key={d.id}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{
                      background: d.color,
                      boxShadow: `0 0 8px ${d.color}88`,
                    }}
                  />
                  {d.name}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/5">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="h-11 w-32 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Attribute
                  </TableHead>
                  {distros.map((d) => (
                    <TableHead key={d.id} className="h-11">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            background: d.color,
                            boxShadow: `0 0 10px ${d.color}66`,
                          }}
                        />
                        <span className="truncate text-[13px] font-semibold text-foreground">
                          {d.name}
                        </span>
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-white/5">
                  <TableCell className="text-xs text-muted-foreground">
                    Family
                  </TableCell>
                  {distros.map((d) => (
                    <TableCell key={d.id} className="text-[13px]">
                      {d.family}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="border-white/5">
                  <TableCell className="text-xs text-muted-foreground">
                    Based on
                  </TableCell>
                  {distros.map((d) => (
                    <TableCell key={d.id} className="text-[13px]">
                      {d.basedOn ?? "Independent"}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="border-white/5">
                  <TableCell className="text-xs text-muted-foreground">
                    Packages
                  </TableCell>
                  {distros.map((d) => (
                    <TableCell key={d.id} className="font-mono text-[13px]">
                      {d.packageManager}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="border-white/5">
                  <TableCell className="text-xs text-muted-foreground">
                    Init
                  </TableCell>
                  {distros.map((d) => (
                    <TableCell key={d.id} className="text-[13px]">
                      <span
                        className={
                          d.initSystem !== "systemd"
                            ? "font-medium text-amber-200"
                            : undefined
                        }
                        title={d.initNote ?? undefined}
                      >
                        {d.initSystem === "other"
                          ? (d.initNote ?? "custom")
                          : d.initSystem}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="border-white/5">
                  <TableCell className="text-xs text-muted-foreground">
                    Releases
                  </TableCell>
                  {distros.map((d) => (
                    <TableCell key={d.id} className="text-[13px]">
                      {d.releaseModel === "rolling" ? "Rolling" : "Point"}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="border-white/5">
                  <TableCell className="text-xs text-muted-foreground">
                    Min RAM
                  </TableCell>
                  {distros.map((d) => (
                    <TableCell key={d.id} className="font-mono text-[13px]">
                      {d.ramMin} MB
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="border-white/5">
                  <TableCell className="text-xs text-muted-foreground">
                    Difficulty
                  </TableCell>
                  {distros.map((d) => (
                    <TableCell key={d.id}>
                      <DifficultyDots level={d.difficulty} />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="border-white/5">
                  <TableCell className="text-xs text-muted-foreground">
                    Popularity
                  </TableCell>
                  {distros.map((d) => (
                    <TableCell key={d.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/8">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${d.popularity}%`,
                              background: `linear-gradient(90deg, ${d.color}88, ${d.color})`,
                            }}
                          />
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {d.popularity}
                        </span>
                      </span>
                    </TableCell>
                  ))}
                </TableRow>

                {COMPARE_SCORES.map((score) => (
                  <TableRow key={score.key} className="border-white/5">
                    <TableCell className="text-xs text-muted-foreground">
                      {score.label}
                    </TableCell>
                    {distros.map((d) => {
                      const value = d.scores[score.key];
                      const best = Math.max(
                        ...distros.map((x) => x.scores[score.key])
                      );
                      return (
                        <TableCell key={d.id}>
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/8">
                              <span
                                className="block h-full rounded-full"
                                style={{
                                  width: `${value}%`,
                                  background:
                                    value === best
                                      ? "linear-gradient(90deg, #a78bfa, #e879f9)"
                                      : "rgba(255,255,255,0.25)",
                                }}
                              />
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {value}
                              {value === best && (
                                <span className="ml-0.5 text-fuchsia-300">
                                  ★
                                </span>
                              )}
                            </span>
                          </span>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}

                <TableRow className="border-white/5">
                  <TableCell />
                  {distros.map((d) => (
                    <TableCell key={d.id}>
                      <button
                        onClick={() => toggleCompare(d.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-rose-300"
                      >
                        <X className="size-3" />
                        Remove
                      </button>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
