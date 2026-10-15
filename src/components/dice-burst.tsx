"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * One burst of particles fired from the surprise-me dice.
 * Particles are derived from the roll counter during render — every roll
 * re-keys the burst so the previous one exits while the new one flies.
 * Deterministic per roll: seeded by the counter, so every roll looks
 * different yet stays SSR-stable.
 */

const BURST_COLORS = [
  "#e879f9", // fuchsia
  "#c084fc", // violet
  "#fbbf24", // amber
  "#fda4af", // rose
  "#ffffff",
];

type Particle = {
  angle: number;
  dist: number;
  size: number;
  color: string;
  delay: number;
  shape: "dot" | "spark" | "ring";
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildBurst(seed: number, accent: string): Particle[] {
  const rand = mulberry32(seed * 1013 + 77);
  const palette = [accent, ...BURST_COLORS];
  const shapes: Particle["shape"][] = ["dot", "dot", "dot", "spark", "ring"];
  return Array.from({ length: 16 }, (_, i) => ({
    angle: (i / 16) * Math.PI * 2 + rand() * 0.7,
    dist: 46 + rand() * 58,
    size: 3 + rand() * 4.5,
    color: palette[Math.floor(rand() * palette.length)],
    delay: rand() * 0.06,
    shape: shapes[Math.floor(rand() * shapes.length)],
  }));
}

export function DiceBurst({
  trigger,
  accent = "#e879f9",
}: {
  /** increments on every roll — 0 renders nothing */
  trigger: number;
  accent?: string;
}) {
  const reduced = useReducedMotion() ?? false;

  const particles = useMemo(
    () => (trigger > 0 && !reduced ? buildBurst(trigger, accent) : null),
    [trigger, reduced, accent]
  );

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
    >
      <AnimatePresence>
        {particles &&
          particles.map((p, i) => {
            const dx = Math.cos(p.angle) * p.dist;
            const dy = Math.sin(p.angle) * p.dist;
            return (
              <motion.span
                key={`${trigger}-${i}`}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
                animate={{
                  x: dx,
                  y: dy,
                  opacity: 0,
                  scale: p.shape === "ring" ? 1.6 : 0.9,
                  rotate: p.shape === "spark" ? 220 : 0,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, delay: p.delay, ease: "easeOut" }}
                className="absolute block"
                style={{
                  width: p.shape === "spark" ? 2.5 : p.size,
                  height:
                    p.shape === "ring"
                      ? p.size
                      : p.shape === "spark"
                        ? 11
                        : p.size,
                  background: p.shape === "ring" ? "transparent" : p.color,
                  border:
                    p.shape === "ring" ? `1.5px solid ${p.color}` : undefined,
                  borderRadius: p.shape === "spark" ? "2px" : "999px",
                  boxShadow: `0 0 8px ${p.color}88`,
                }}
              />
            );
          })}
      </AnimatePresence>
    </span>
  );
}
