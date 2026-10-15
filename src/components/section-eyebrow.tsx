"use client";

import { cn } from "@/lib/utils";

/**
 * Editorial section eyebrow — mono index, tracked label, hairline rule.
 * Gives the page a magazine-like reading rhythm:
 *
 *   01 — EXPLORE ————————————————   (align="left")
 *   ————— 02 — FINDER ——————————    (align="center")
 */
export function SectionEyebrow({
  index,
  label,
  icon: Icon,
  tone = "violet",
  align = "left",
  className,
}: {
  index: string;
  label: string;
  icon?: React.ElementType;
  tone?: "violet" | "fuchsia" | "amber";
  align?: "left" | "center";
  className?: string;
}) {
  const toneClass =
    tone === "fuchsia"
      ? "text-fuchsia-300"
      : tone === "amber"
        ? "text-amber-300"
        : "text-violet-300";

  return (
    <div
      className={cn(
        "flex w-full items-center gap-3",
        align === "center" && "justify-center",
        className
      )}
    >
      {align === "center" && (
        <span className="eyebrow-rule rotate-180" aria-hidden />
      )}
      <span className="glass-soft inline-flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
        <span
          className="bg-gradient-to-br from-white/90 via-white/70 to-white/35 bg-clip-text font-mono text-[10px] font-bold tracking-[0.18em] text-transparent"
          aria-hidden
        >
          {index}
        </span>
        {Icon && <Icon className={cn("size-3.5", toneClass)} />}
        <span className="uppercase tracking-[0.14em]">{label}</span>
      </span>
      <span className="eyebrow-rule" aria-hidden />
    </div>
  );
}
