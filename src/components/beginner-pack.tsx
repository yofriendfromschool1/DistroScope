"use client";

// ─────────────────────────────────────────────────────────────
// DistroScope — Beginner day-one kit
// Interactive checklist + starter-app grid recommending the
// community Beginner-Linux-Apps repo (GUI-first, any distro).
// ─────────────────────────────────────────────────────────────

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Github,
  RotateCcw,
  Sprout,
  Terminal,
  Timer,
} from "lucide-react";
import {
  BEGINNER_APPS,
  BEGINNER_REPO_OWNER,
  BEGINNER_REPO_URL,
  BEGINNER_STEPS,
  BEGINNER_TRUTHS,
} from "@/data/beginner-pack";
import { DistroIcon } from "@/components/icon";
import { SectionEyebrow } from "@/components/section-eyebrow";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CHECKLIST_KEY = "distroscope:beginner-steps";
const CHECKLIST_EVENT = "distroscope:beginner-steps-changed";
const EMPTY_SET: ReadonlySet<string> = new Set();

function parseChecked(raw: string | null): ReadonlySet<string> {
  if (!raw) return EMPTY_SET;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_SET;
    const valid = BEGINNER_STEPS.map((s) => s.id);
    const set = new Set(
      (parsed as string[]).filter((id) => valid.includes(id))
    );
    return set;
  } catch {
    return EMPTY_SET;
  }
}

// cached snapshot so useSyncExternalStore sees a stable reference
let cachedRaw: string | null | undefined;
let cachedSet: ReadonlySet<string> = EMPTY_SET;

function getSnapshot(): ReadonlySet<string> {
  const raw = window.localStorage.getItem(CHECKLIST_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSet = parseChecked(raw);
  }
  return cachedSet;
}

function getServerSnapshot(): ReadonlySet<string> {
  return EMPTY_SET;
}

function writeChecked(next: ReadonlySet<string>) {
  try {
    if (next.size === 0) window.localStorage.removeItem(CHECKLIST_KEY);
    else
      window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify([...next]));
    window.dispatchEvent(new Event(CHECKLIST_EVENT));
  } catch {
    // non-critical: private mode / quota / disabled storage
  }
}

export function BeginnerPack() {
  const { toast } = useToast();

  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener(CHECKLIST_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHECKLIST_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const checked = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const toggleStep = useCallback((id: string) => {
    const current = getSnapshot();
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    writeChecked(next);
  }, []);

  const resetSteps = useCallback(() => {
    writeChecked(EMPTY_SET);
  }, []);

  const progress = checked.size / BEGINNER_STEPS.length;

  const copyFlatpakId = useCallback(
    async (name: string, flatpakId: string) => {
      if (flatpakId === "native package") {
        toast({
          title: "Install from your software store",
          description: `${name} is a native package — grab it from your distro's store or package manager.`,
        });
        return;
      }
      try {
        await navigator.clipboard.writeText(flatpakId);
        toast({
          title: "Flatpak ID copied",
          description: `${flatpakId} — paste it after “flatpak install flathub”.`,
        });
      } catch {
        toast({
          title: flatpakId,
          description: `${name} — copy this ID and install it from your software store.`,
        });
      }
    },
    [toast]
  );

  const copyCommands = useCallback(
    async (title: string, lines: string[]) => {
      const text = lines.join("\n");
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Commands copied",
          description: `${title} — paste them into a terminal.`,
        });
      } catch {
        toast({
          title: "Couldn't reach the clipboard",
          description: "Select the lines manually — they're selectable.",
        });
      }
    },
    [toast]
  );

  const essentialApps = useMemo(
    () => BEGINNER_APPS.filter((a) => a.essentialTool),
    []
  );
  const regularApps = useMemo(
    () => BEGINNER_APPS.filter((a) => !a.essentialTool),
    []
  );

  return (
    <section
      id="beginner-kit"
      aria-labelledby="beginner-kit-heading"
      className="relative mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20"
    >
      <header className="mx-auto max-w-2xl text-center">
        <SectionEyebrow
          index="03"
          label="Beginner kit"
          icon={Sprout}
          tone="amber"
          align="center"
        />
        <h2
          id="beginner-kit-heading"
          className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Picked a distro?{" "}
          <span className="text-gradient">Day one, sorted.</span>
        </h2>
        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          The five first steps, the starter apps, and one script that sets it
          all up — curated in the community&apos;s{" "}
          <span className="font-medium text-foreground">Beginner-Linux-Apps</span>{" "}
          guide. Works whichever distro you just installed.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {BEGINNER_TRUTHS.map((t) => (
            <span
              key={t.label}
              className="glass-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              <DistroIcon name={t.icon} className="size-3.5 text-amber-300" />
              {t.label}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-12 grid items-start gap-6 lg:grid-cols-[5fr_7fr] lg:gap-8">
        {/* ── Left: the five steps as a checkable timeline ── */}
        <div className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-amber-500/10 blur-[70px]" />

          <div className="relative flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Your first 15 minutes</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tap a step to check it off — progress is saved on this device.
              </p>
            </div>
              <button
                type="button"
                onClick={resetSteps}
                className={cn(
                  "flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
                  checked.size === 0 && "pointer-events-none opacity-0"
                )}
                tabIndex={checked.size === 0 ? -1 : 0}
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
          </div>

          {/* progress bar */}
          <div className="relative mt-4" aria-hidden>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
                )}
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-right text-[11px] font-medium text-amber-200/90">
              {checked.size} of {BEGINNER_STEPS.length} done
              {checked.size === BEGINNER_STEPS.length && " — you're all set 🎉"}
            </p>
          </div>

          <ol className="relative mt-4 space-y-3">
            {/* connecting timeline line */}
            <span
              className="absolute bottom-4 left-[27px] top-4 w-px bg-gradient-to-b from-amber-300/40 via-white/10 to-transparent"
              aria-hidden
            />
            {BEGINNER_STEPS.map((step, i) => {
              const done = checked.has(step.id);
              return (
                <motion.li
                  key={step.id}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className={cn(
                    "rounded-2xl border transition-all duration-200",
                    done
                      ? "border-emerald-300/25 bg-emerald-400/[0.07]"
                      : "border-white/10 bg-white/[0.03] hover:border-amber-200/25 hover:bg-white/[0.06]"
                  )}
                >
                  {/* header row toggles the step — a real button so the
                      command block below can host its own copy button */}
                  <button
                    type="button"
                    onClick={() => toggleStep(step.id)}
                    aria-pressed={done}
                    className="group flex w-full items-start gap-3 p-3.5 text-left"
                  >
                    <span
                      className={cn(
                        "relative grid size-9 shrink-0 place-items-center rounded-xl border font-mono text-[11px] font-bold transition-all duration-200",
                        done
                          ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-200"
                          : "border-amber-200/25 bg-amber-400/10 text-amber-200 group-hover:scale-110"
                      )}
                    >
                      {done ? (
                        <Check className="size-4" />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <DistroIcon
                          name={step.icon}
                          className={cn(
                            "size-4 shrink-0",
                            done ? "text-emerald-300" : "text-amber-300"
                          )}
                        />
                        <span
                          className={cn(
                            "text-[13.5px] font-semibold",
                            done && "text-muted-foreground line-through decoration-emerald-300/50"
                          )}
                        >
                          {step.title}
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <Timer className="size-2.5" />
                          {step.time}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-1 block text-xs leading-relaxed text-muted-foreground/90",
                          done && "opacity-60"
                        )}
                      >
                        {step.detail}
                      </span>
                    </span>
                  </button>

                  {/* terminal block — the actual commands, copyable */}
                  {step.commands && (
                    <div className="px-3.5 pb-3.5">
                      <div className="group/cmd relative overflow-hidden rounded-xl border border-white/[0.08] bg-black/40">
                        {/* window chrome dots */}
                        <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-3 py-1.5">
                          <span className="size-2 rounded-full bg-rose-400/50" />
                          <span className="size-2 rounded-full bg-amber-300/50" />
                          <span className="size-2 rounded-full bg-emerald-400/50" />
                          <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                            <Terminal className="size-2.5" />
                            terminal
                          </span>
                          <button
                            type="button"
                            onClick={() => void copyCommands(step.title, step.commands!)}
                            className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70 transition-colors hover:bg-white/[0.07] hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                            aria-label={`Copy the ${step.title} commands`}
                          >
                            <Copy className="size-3" />
                            Copy
                          </button>
                        </div>
                        <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[11px] leading-relaxed">
                          {step.commands.map((cmd) => (
                            <code
                              key={cmd}
                              className="block whitespace-pre text-amber-100/85 select-text"
                            >
                              <span className="mr-1.5 select-none text-emerald-400/70">$</span>
                              {cmd}
                            </code>
                          ))}
                        </pre>
                      </div>
                      {step.commandNote && (
                        <p className="mt-1.5 text-[10.5px] leading-snug text-muted-foreground/70">
                          {step.commandNote}
                        </p>
                      )}
                    </div>
                  )}
                </motion.li>
              );
            })}
          </ol>
        </div>

        {/* ── Right: starter apps + repo CTA ── */}
        <div className="flex flex-col gap-6">
          <div className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6">
            <div className="pointer-events-none absolute -bottom-24 -right-16 size-56 rounded-full bg-violet-500/10 blur-[70px]" />
            <div className="relative">
              <h3 className="text-base font-semibold">The starter app pack</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tap any app to copy its Flatpak ID — the same app works on
                every distro.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {regularApps.map((app, i) => (
                  <motion.button
                    key={app.id}
                    type="button"
                    onClick={() => copyFlatpakId(app.name, app.flatpakId)}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ duration: 0.35, delay: (i % 6) * 0.05 }}
                    title={app.why}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300/30 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
                  >
                    <span className="flex items-center gap-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.05] transition-all duration-200 group-hover:scale-110 group-hover:border-violet-300/30">
                        <DistroIcon
                          name={app.icon}
                          className="size-4 text-violet-200"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">
                          {app.name}
                        </span>
                        <span className="block text-[10.5px] uppercase tracking-wide text-muted-foreground/80">
                          {app.category}
                        </span>
                      </span>
                    </span>
                    <span className="mt-2 block truncate rounded-md bg-black/25 px-1.5 py-0.5 font-mono text-[10px] text-violet-100/70">
                      {app.flatpakId}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* essential tools strip */}
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  The three unsung heroes
                </p>
                <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
                  {essentialApps.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => copyFlatpakId(app.name, app.flatpakId)}
                      title={app.why}
                      className="group rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.05] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300/40 hover:bg-emerald-400/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                    >
                      <span className="flex items-center gap-2">
                        <DistroIcon
                          name={app.icon}
                          className="size-4 shrink-0 text-emerald-300"
                        />
                        <span className="text-[13px] font-semibold">
                          {app.name}
                        </span>
                      </span>
                      <span className="mt-1 block text-[11px] leading-snug text-muted-foreground/90">
                        {app.why}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* repo CTA */}
          <motion.a
            href={BEGINNER_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.45 }}
            className="group relative block overflow-hidden rounded-3xl border border-amber-200/20 bg-gradient-to-br from-amber-500/[0.09] via-violet-500/[0.06] to-transparent p-5 transition-all duration-300 hover:border-amber-200/40 hover:shadow-[0_0_40px_rgb(251_191_36/0.09)] sm:p-6"
          >
            <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-amber-400/10 blur-[60px] transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-amber-200/25 bg-amber-400/10 shadow-[0_0_24px_rgb(251_191_36/0.15)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Github className="size-5.5 text-amber-100" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold tracking-tight sm:text-[15px]">
                  Beginner-Linux-Apps{" "}
                  <span className="font-normal text-muted-foreground">
                    on GitHub
                  </span>
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  GUI updaters per distro, Flatpak &amp; Flathub setup, codecs,
                  and an installer script that auto-detects your distro and
                  does steps 1–4 for you.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-gradient-to-r from-amber-400/90 to-orange-400/90 px-4 py-2 text-xs font-semibold text-black shadow-[0_0_20px_rgb(251_191_36/0.25)] transition-transform duration-200 group-hover:scale-105 sm:self-center">
                Open the repo
                <DistroIcon
                  name="ArrowUpRight"
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </span>
            </div>
            <p className="relative mt-4 border-t border-white/8 pt-3 text-[11px] text-muted-foreground/70">
              Curated by{" "}
              <span className="font-medium text-amber-200/80">
                @{BEGINNER_REPO_OWNER}
              </span>{" "}
              · MIT licensed · referenced with love by DistroScope
            </p>
          </motion.a>
        </div>
      </div>
    </section>
  );
}
