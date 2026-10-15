"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  ArrowRight,
  Boxes,
  CalendarHeart,
  Compass,
  GitBranch,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DISTROS } from "@/data/distros";
import { useDistroScope } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const TERMINAL_CMD = "distroscope --find-me";

type TermLine = { readonly kind: "qa" | "ok" | "result"; readonly text: string };

type TerminalPersona = { readonly label: string; readonly lines: readonly TermLine[] };

/** Demo personas the terminal cycles through — one per loop. */
const TERMINAL_PERSONAS: readonly TerminalPersona[] = [
  {
    label: "the newcomer",
    lines: [
      { kind: "qa", text: "? device        everyday laptop" },
      { kind: "qa", text: "? experience    first-time linuxer" },
      { kind: "qa", text: "? priorities    gaming + privacy" },
      { kind: "ok", text: `scanning ${DISTROS.length} distros across 8 families...` },
      { kind: "result", text: "Pop!_OS 94%  ·  Fedora 88%  ·  Mint 85%" },
    ],
  },
  {
    label: "the privacy maven",
    lines: [
      { kind: "qa", text: "? device        spare thinkpad" },
      { kind: "qa", text: "? experience    daily driver, 5 yrs" },
      { kind: "qa", text: "? priorities    privacy above all" },
      { kind: "ok", text: `scanning ${DISTROS.length} distros across 8 families...` },
      { kind: "result", text: "Qubes OS 96%  ·  Tails 90%  ·  Debian 87%" },
    ],
  },
  {
    label: "the tinkerer",
    lines: [
      { kind: "qa", text: "? device        custom workstation" },
      { kind: "qa", text: "? experience    arch-wiki contributor" },
      { kind: "qa", text: "? priorities    control + bleeding edge" },
      { kind: "ok", text: `scanning ${DISTROS.length} distros across 8 families...` },
      { kind: "result", text: "CachyOS 97%  ·  Arch 95%  ·  NixOS 89%" },
    ],
  },
] as const;

/** deterministic daily pick so reduced-motion users still see variety across days */
const personaOfDay = () =>
  TERMINAL_PERSONAS[
    Math.floor(Date.now() / 86_400_000) % TERMINAL_PERSONAS.length
  ];

type TermState = {
  /** characters of the command typed so far */
  cmdLen: number;
  /** number of fully revealed lines */
  lines: number;
  /** characters of the currently typing line */
  partialLen: number;
  /** all lines printed — resting before the loop restarts */
  resting: boolean;
  /** active persona index — content rotates every loop */
  personaIdx: number;
};

/**
 * Loops the terminal: types the command, prints each line character by
 * character, rests, then clears and starts over with the next persona.
 * Reduced motion → static render of the day's persona.
 */
function useTypedTerminal(reduced: boolean): TermState {
  const [state, setState] = useState<TermState>(() => ({
    cmdLen: 0,
    lines: 0,
    partialLen: 0,
    resting: false,
    personaIdx: 0,
  }));

  useEffect(() => {
    if (reduced) {
      const idx = TERMINAL_PERSONAS.indexOf(personaOfDay());
      setState({
        cmdLen: TERMINAL_CMD.length,
        lines: TERMINAL_PERSONAS[idx].lines.length,
        partialLen: 0,
        resting: true,
        personaIdx: idx,
      });
      return;
    }
    let cancelled = false;
    const timers = new Set<number>();
    const wait = (ms: number) =>
      new Promise<void>((res) => {
        const t = window.setTimeout(() => {
          timers.delete(t);
          res();
        }, ms);
        timers.add(t);
      });

    const run = async () => {
      await wait(900); // let the card entrance finish first
      let personaIdx = 0;
      while (!cancelled) {
        const persona = TERMINAL_PERSONAS[personaIdx];
        setState({
          cmdLen: 0,
          lines: 0,
          partialLen: 0,
          resting: false,
          personaIdx,
        });
        await wait(450);
        for (let i = 1; i <= TERMINAL_CMD.length; i++) {
          if (cancelled) return;
          setState((s) => ({ ...s, cmdLen: i }));
          await wait(52);
        }
        await wait(380);
        for (let li = 0; li < persona.lines.length; li++) {
          const line = persona.lines[li];
          for (let c = 1; c <= line.text.length; c++) {
            if (cancelled) return;
            setState((s) => ({ ...s, lines: li, partialLen: c }));
            await wait(line.kind === "ok" ? 12 : 19);
          }
          if (cancelled) return;
          setState((s) => ({ ...s, lines: li + 1, partialLen: 0 }));
          await wait(line.kind === "result" ? 240 : 300);
        }
        setState((s) => ({ ...s, resting: true }));
        await wait(4600);
        personaIdx = (personaIdx + 1) % TERMINAL_PERSONAS.length;
      }
    };
    void run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [reduced]);

  return state;
}

const MARQUEE_NAMES = [
  "Ubuntu",
  "Linux Mint",
  "Debian",
  "Fedora",
  "Arch Linux",
  "Pop!_OS",
  "Manjaro",
  "Zorin OS",
  "MX Linux",
  "elementary OS",
  "EndeavourOS",
  "openSUSE",
  "KDE neon",
  "NixOS",
  "Garuda",
  "CachyOS",
  "Kali Linux",
  "Void Linux",
  "Gentoo",
  "Tails",
  "Solus",
  "Qubes OS",
];

const HERO_STATS = [
  { icon: Boxes, label: `${DISTROS.length} distros` },
  { icon: GitBranch, label: "8 families" },
  { icon: ListChecks, label: "16 questions" },
  { icon: ShieldCheck, label: "0 telemetry" },
];

/** deterministic daily pick — same distro for everyone, changes at midnight */
function getDistroOfDay() {
  const now = new Date();
  const dayOfYear =
    Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
        86_400_000
    ) || 1;
  return DISTROS[dayOfYear % DISTROS.length];
}

export function Hero() {
  const distroOfDay = getDistroOfDay();
  const setHighlight = useDistroScope((s) => s.setHighlight);
  const { toast } = useToast();
  const reduced = useReducedMotion() ?? false;
  const term = useTypedTerminal(reduced);

  const spotlightDistro = () => {
    setHighlight([distroOfDay.id]);
    document
      .getElementById("explore")
      ?.scrollIntoView({ behavior: "smooth" });
    toast({
      title: `Today's spotlight — ${distroOfDay.name}`,
      description: `${distroOfDay.tagline} Look for the glowing bubble.`,
    });
  };

  return (
    <section className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pb-10 pt-32 sm:px-6 sm:pt-36 lg:pt-40 print:hidden">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        {/* Copy */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-start"
        >
          <motion.div
            variants={item}
            className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-fuchsia-400" />
            </span>
            The glass map of the Linux universe
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Find the Linux that{" "}
            <span className="text-gradient">feels like home</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-foreground/75 sm:text-lg"
          >
            DistroScope charts every major distro on one interactive map —
            then asks the right questions to find{" "}
            <em className="not-italic font-medium text-foreground">your</em> perfect
            match. No sign-up, no tracking, just clarity.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <Button
              asChild
              className="h-12 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-[15px] font-medium shadow-[0_10px_36px_rgb(192_132_252/0.4)] transition-all hover:brightness-110 hover:shadow-[0_10px_44px_rgb(192_132_252/0.6)] active:scale-[0.98]"
            >
              <a href="#finder">
                <Sparkles className="size-4" />
                Take the quiz
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="glass h-12 rounded-xl border-white/10 px-6 text-[15px] font-medium text-foreground transition-all hover:bg-white/10 hover:text-foreground active:scale-[0.98]"
            >
              <a href="#explore">
                <Compass className="size-4" />
                Explore the graph
              </a>
            </Button>
          </motion.div>

          {/* distro of the day */}
          <motion.button
            variants={item}
            type="button"
            onClick={spotlightDistro}
            className="glass group mt-4 flex max-w-full items-center gap-3 rounded-2xl p-2.5 pr-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-fuchsia-300/30 hover:shadow-[0_8px_32px_rgb(232_121_249/0.18)]"
            aria-label={`Today's spotlight distro: ${distroOfDay.name} — highlight it on the graph`}
          >
            <span
              className="grid size-10 shrink-0 place-items-center rounded-xl font-bold"
              style={{
                background: `${distroOfDay.color}26`,
                color: distroOfDay.color,
                boxShadow: `inset 0 0 0 1px ${distroOfDay.color}40`,
              }}
            >
              {distroOfDay.initials}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-300">
                <CalendarHeart className="size-3" />
                Today's spotlight
              </span>
              <span className="mt-0.5 flex min-w-0 items-baseline gap-2">
                <span className="truncate text-sm font-semibold text-foreground">
                  {distroOfDay.name}
                </span>
                <span className="hidden truncate text-xs text-muted-foreground md:inline">
                  {distroOfDay.tagline}
                </span>
              </span>
            </span>
            <ArrowRight className="ml-1 size-3.5 shrink-0 text-muted-foreground/60 transition-all duration-300 group-hover:translate-x-1 group-hover:text-fuchsia-300" />
          </motion.button>

          <motion.div
            variants={item}
            className="mt-9 flex flex-wrap items-center gap-2.5"
          >
            {HERO_STATS.map((stat) => (
              <div
                key={stat.label}
                className="chip-glass flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:text-foreground hover:shadow-[0_0_20px_rgb(192_132_252/0.25)]"
              >
                <stat.icon className="size-3.5 text-fuchsia-300 transition-transform duration-300 group-hover:scale-110" />
                {stat.label}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Terminal card */}
        <motion.div
          initial={{ opacity: 0, y: 32, rotate: 1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-xl"
        >
          {/* floating chips */}
          <div className="glass absolute -top-5 -right-3 z-10 hidden animate-float items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-rose-200 sm:flex">
            gaming-ready
          </div>
          <div className="glass absolute -bottom-5 -left-2 z-10 hidden animate-float-late items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-amber-200 sm:flex">
            runs in 512 MB
          </div>

          <div className="glass relative overflow-hidden rounded-3xl p-1.5 shadow-[0_24px_70px_rgb(0_0_0/0.45)]">
            {/* ambient glow behind the window */}
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-violet-500/10 blur-3xl" />
            <div className="rounded-[1.25rem] border border-white/[0.07] bg-black/45 p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] sm:p-6">
              {/* title bar */}
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4 shadow-[0_6px_12px_-8px_rgb(0_0_0/0.8)]">
                <div className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-rose-400/80 shadow-[0_0_8px_rgb(251_113_133/0.4)]" />
                  <span className="size-3 rounded-full bg-amber-400/80 shadow-[0_0_8px_rgb(251_191_36/0.4)]" />
                  <span className="size-3 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgb(52_211_153/0.4)]" />
                </div>
                <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
                  distroscope — zsh
                </span>
              </div>

              {/* lines — typed, looped, rotating personas */}
              <div className="min-h-[9.5rem] space-y-2.5 pt-5 font-mono text-[11.5px] leading-relaxed sm:min-h-[10rem] sm:text-[13px]">
                <p className="text-foreground">
                  <span className="mr-2 text-fuchsia-400">$</span>
                  {TERMINAL_CMD.slice(0, term.cmdLen)}
                  {term.cmdLen < TERMINAL_CMD.length && (
                    <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-fuchsia-300/90" />
                  )}
                </p>
                {TERMINAL_PERSONAS[term.personaIdx].lines.map((line, i) => {
                  if (i > term.lines) return null;
                  const text =
                    i === term.lines
                      ? line.text.slice(0, term.partialLen)
                      : line.text;
                  return (
                    <p
                      key={i}
                      className={
                        line.kind === "qa"
                          ? "text-muted-foreground"
                          : line.kind === "ok"
                            ? "text-emerald-300/90"
                            : "text-gradient font-medium"
                      }
                    >
                      {line.kind === "ok" && (
                        <span className="mr-2 text-emerald-400">✓</span>
                      )}
                      {line.kind === "result" && (
                        <span className="mr-2 text-violet-300">→</span>
                      )}
                      {text}
                      {i === term.lines && term.partialLen > 0 && (
                        <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-fuchsia-300/90" />
                      )}
                    </p>
                  );
                })}
                {term.resting && (
                  <p className="text-foreground">
                    <span className="mr-2 text-fuchsia-400">$</span>
                    <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-fuchsia-300/90" />
                  </p>
                )}
              </div>
              {/* persona footer — which demo user is typing */}
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3.5 font-mono text-[10px] tracking-wide text-muted-foreground/70">
                <span>
                  <span className="text-fuchsia-300/70">run as</span>{" "}
                  {TERMINAL_PERSONAS[term.personaIdx].label}
                  <span className="ml-1.5 text-white/20">·</span>
                  <span className="ml-1.5">
                    {(term.personaIdx + 1) % TERMINAL_PERSONAS.length === 0
                      ? "next: " + TERMINAL_PERSONAS[0].label
                      : "next: " +
                        TERMINAL_PERSONAS[term.personaIdx + 1].label}
                  </span>
                </span>
                <span className="text-emerald-300/60">● live</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* marquee */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="mask-fade-x group mt-16 overflow-hidden sm:mt-20"
      >
        <div className="flex w-max animate-marquee gap-3 pr-3 group-hover:[animation-play-state:paused]">
          {[...MARQUEE_NAMES, ...MARQUEE_NAMES].map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="glass-soft whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-300 hover:border-white/25 hover:bg-white/[0.07] hover:text-foreground hover:shadow-[0_0_18px_rgb(192_132_252/0.18)]"
            >
              {name}
            </span>
          ))}
        </div>
      </motion.div>

      {/* scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="mt-12 flex justify-center"
      >
        <a
          href="#explore"
          className="flex flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="text-xs">scroll to explore</span>
          <ArrowRight className="size-4 rotate-90 animate-float" />
        </a>
      </motion.div>
    </section>
  );
}
