"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowRight,
  Bot,
  Braces,
  Check,
  ChevronDown,
  ChevronLeft,
  ClipboardCopy,
  ExternalLink,
  GitCompare,
  History,
  ImageDown,
  Info,
  ListChecks,
  MapPinned,
  MousePointerClick,
  PenLine,
  Printer,
  Radar as RadarIcon,
  RotateCcw,
  Share2,
  SkipForward,
  Sparkles,
  Sprout,
  Swords,
  Telescope,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DistroIcon } from "@/components/icon";
import { DistroDialog } from "@/components/distro-dialog";
import { SectionEyebrow } from "@/components/section-eyebrow";
import { QUIZ_QUESTIONS } from "@/data/questions";
import { DISTROS } from "@/data/distros";
import {
  BEGINNER_REPO_URL,
  BEGINNER_STEPS,
} from "@/data/beginner-pack";
import { computeUserProfile } from "@/lib/matching";
import { TRAIT_LABELS } from "@/lib/similarity";
import { useDistroScope } from "@/lib/store";
import { buildShareUrl, decodeQuizAnswers, encodeQuizAnswers } from "@/lib/quiz-url";
import {
  clearQuizProgress,
  loadQuizProgress,
  saveQuizProgress,
  type QuizProgress,
} from "@/lib/quiz-progress";
import { downloadProfileCard, downloadShareCard } from "@/lib/share-card";
import {
  buildResultsMarkdown,
  copyToClipboard,
} from "@/lib/markdown-export";
import { downloadResultsJson } from "@/lib/json-export";
import type {
  Distro,
  DistroMatch,
  MatchResponse,
  QuizAnswers,
  QuizQuestion,
  ScoreKey,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Phase = "intro" | "quiz" | "analyzing" | "results";

const ANALYZING_MESSAGES = [
  `Scanning ${DISTROS.length} distros...`,
  "Consulting the Arch wiki...",
  "Weighing your priorities...",
  "Measuring RAM footprints...",
  "Cross-checking family trees...",
  "Almost there...",
];

const DIFFICULTY_LABELS = [
  "Absolute beginner",
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
];

const PROFILE_RADAR_TRAITS: { key: ScoreKey; label: string }[] = [
  { key: "easeOfUse", label: "Ease" },
  { key: "customizability", label: "Control" },
  { key: "performance", label: "Speed" },
  { key: "outOfBox", label: "Ready" },
  { key: "stability", label: "Stable" },
  { key: "freshness", label: "Fresh" },
  { key: "privacyFocus", label: "Private" },
  { key: "gamingSupport", label: "Gaming" },
];

const slide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -48 }),
};

function MatchRing({
  value,
  size = 96,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const gradId = useId();
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${value} percent match${label ? ` for ${label}` : ""}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={7}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * value) / 100 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          style={{
            filter: "drop-shadow(0 0 6px rgba(232,121,249,0.45))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono font-bold leading-none"
          style={{ fontSize: size / 4 }}
        >
          {value}
          <span className="text-[0.6em]">%</span>
        </span>
        {label && (
          <span className="mt-1 max-w-full truncate text-[9px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

function ProfileRadar({
  distro,
  profile,
}: {
  distro: Distro;
  profile: Partial<Record<ScoreKey, number>>;
}) {
  const data = PROFILE_RADAR_TRAITS.map((t) => ({
    trait: t.label,
    you: profile[t.key] ?? 50,
    match: distro.scores[t.key],
  }));

  const strongestAsks = useMemo(
    () =>
      (Object.entries(profile) as [ScoreKey, number][])
        .filter(([, v]) => Math.abs(v - 50) >= 15)
        .sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50))
        .slice(0, 3),
    [profile]
  );

  return (
    <div className="grid items-center gap-5 sm:grid-cols-[1fr_0.85fr]">
      <div className="glass-soft rounded-2xl p-3">
        <div className="h-60 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="74%">
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
              <Radar
                name={distro.name}
                dataKey="match"
                stroke={distro.color}
                fill={distro.color}
                fillOpacity={0.22}
                strokeWidth={2}
                dot={{ r: 2.5, fill: distro.color, strokeWidth: 0 }}
              />
              <Radar
                name="You"
                dataKey="you"
                stroke="#e879f9"
                fill="#c084fc"
                fillOpacity={0.3}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 2.5, fill: "#e879f9", strokeWidth: 0 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span
              className="size-2.5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400"
              style={{ boxShadow: "0 0 8px rgba(232,121,249,0.5)" }}
            />
            You — from your answers
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
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

        {strongestAsks.length > 0 ? (
          <div className="mt-4 space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
              Your strongest asks
            </p>
            {strongestAsks.map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs font-medium">
                  {TRAIT_LABELS[key] ?? key}
                </span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="absolute inset-y-0 left-1/2 w-px bg-white/20"
                    aria-hidden
                  />
                  <div
                    className="absolute inset-y-0 rounded-full bg-gradient-to-r from-violet-500/70 to-fuchsia-500/70"
                    style={{
                      width: `${Math.abs(value - 50) * 2}%`,
                      left: value >= 50 ? "50%" : undefined,
                      right: value < 50 ? "50%" : undefined,
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-[11px] text-fuchsia-200">
                  {value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Your answers stayed close to neutral — the engine leaned on the
            questions you answered decisively.
          </p>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground/70">
          50 is neutral. The dashed polygon is you; the solid one is {distro.name}.
          Where they overlap, the match runs deep.
        </p>
      </div>
    </div>
  );
}

export function QuizSection() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [analyzingMsg, setAnalyzingMsg] = useState(0);
  const [feedbackGiven, setFeedbackGiven] = useState<"up" | "down" | null>(null);
  const [selectedDistro, setSelectedDistro] = useState<Distro | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);
  const [answersOpen, setAnswersOpen] = useState(false);
  /** saved progress offering "resume" on the intro screen (null = none) */
  const [resume, setResume] = useState<QuizProgress | null>(null);
  const advancing = useRef(false);
  const restoredRef = useRef(false);
  const { toast } = useToast();

  const setHighlight = useDistroScope((s) => s.setHighlight);
  const compare = useDistroScope((s) => s.compare);
  const toggleCompare = useDistroScope((s) => s.toggleCompare);
  const setProfile = useDistroScope((s) => s.setProfile);
  const clearProfile = useDistroScope((s) => s.clearProfile);

  const question: QuizQuestion | undefined = QUIZ_QUESTIONS[index];
  const matches = result?.matches ?? [];
  const top = matches[0];
  const selectedIds = question ? (answers[question.id] ?? []) : [];
  const userProfile = useMemo(
    () => (phase === "results" ? computeUserProfile(answers) : {}),
    [phase, answers]
  );

  /** Beginner signals: first-timer answers (or phone-style app store taste)
   *  unlock the day-one kit recommendation in the results. */
  const isBeginner =
    (answers.experience ?? []).some((id) => id === "none" || id === "dabbled") ||
    (answers.appstore ?? []).includes("visual");

  const analyze = useCallback(
    async (finalAnswers: QuizAnswers) => {
      setPhase("analyzing");
      setAnalyzingMsg(0);
      try {
        const [res] = await Promise.all([
          fetch("/api/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: finalAnswers }),
          }),
          new Promise((r) => setTimeout(r, 1900)),
        ]);
        if (!res.ok) throw new Error("match failed");
        const data = (await res.json()) as MatchResponse;
        setResult(data);
        setFeedbackGiven(null);
        setAiExplanation(null);
        setAiFailed(false);
        setPhase("results");
        // finished run — progress persistence is no longer needed
        clearQuizProgress();
        setResume(null);
        // share the trait profile globally so ANY distro dialog can
        // overlay "You" on its radar (explorer, table, palette…)
        try {
          setProfile(computeUserProfile(finalAnswers));
        } catch {
          // non-critical
        }
        // deep-link: make this result shareable via ?q=<code>
        try {
          const code = encodeQuizAnswers(finalAnswers);
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}?q=${code}#finder`
          );
        } catch {
          // non-critical
        }
        window.dispatchEvent(new Event("distroscope:quiz-done"));
      } catch {
        toast({
          title: "Something went wrong",
          description: "Could not score your answers. Let's try that again.",
          variant: "destructive",
        });
        setPhase("quiz");
      }
    },
    [toast]
  );

  // restore a shared result from ?q=<code> deep-link
  useEffect(() => {
    if (restoredRef.current) return;
    const code = new URLSearchParams(window.location.search).get("q");
    if (!code) {
      // no deep-link → offer to resume an unfinished local run
      const saved = loadQuizProgress();
      if (saved) setResume(saved);
      return;
    }
    const restored = decodeQuizAnswers(code);
    if (!restored) return;
    restoredRef.current = true;
    clearQuizProgress(); // a shared result supersedes local progress
    setResume(null);
    setAnswers(restored);
    analyze(restored);
  }, [analyze]);

  // persist in-flight progress while the quiz runs
  useEffect(() => {
    if (phase !== "quiz") return;
    saveQuizProgress(index, answers);
  }, [phase, index, answers]);

  const advance = useCallback(() => {
    if (advancing.current) return;
    advancing.current = true;
    setDirection(1);
    if (index < QUIZ_QUESTIONS.length - 1) {
      setIndex((i) => i + 1);
      setTimeout(() => (advancing.current = false), 220);
    } else {
      analyze(answers);
      advancing.current = false;
    }
  }, [index, answers, analyze]);

  const goBack = useCallback(() => {
    if (index === 0) return;
    setDirection(-1);
    setIndex((i) => i - 1);
  }, [index]);

  // skip = advance without recording (any previous selection for this
  // question is dropped, so the results panel can show it as skipped)
  const skipQuestion = useCallback(() => {
    if (advancing.current || !question) return;
    advancing.current = true;
    const next = { ...answers };
    delete next[question.id];
    setAnswers(next);
    setDirection(1);
    if (index < QUIZ_QUESTIONS.length - 1) {
      setIndex((i) => i + 1);
      setTimeout(() => (advancing.current = false), 220);
    } else {
      analyze(next);
      advancing.current = false;
    }
  }, [question, answers, index, analyze]);

  // jump back to a question from the results "your answers" panel —
  // continuing through to the end re-analyzes with the updated answers
  const editAnswer = useCallback(
    (qIndex: number) => {
      setDirection(qIndex < index ? -1 : 1);
      setIndex(qIndex);
      setPhase("quiz");
    },
    [index]
  );

  const selectOption = useCallback(
    (q: QuizQuestion, optionId: string) => {
      if (q.type === "single") {
        setAnswers((a) => ({ ...a, [q.id]: [optionId] }));
        setTimeout(() => advance(), 240);
      } else {
        setAnswers((a) => {
          const current = a[q.id] ?? [];
          const next = current.includes(optionId)
            ? current.filter((x) => x !== optionId)
            : current.length >= 3
              ? current
              : [...current, optionId];
          return { ...a, [q.id]: next };
        });
      }
    },
    [advance]
  );

  // rotating analyzing messages
  useEffect(() => {
    if (phase !== "analyzing") return;
    const t = setInterval(
      () =>
        setAnalyzingMsg(
          (m) => (m + 1) % ANALYZING_MESSAGES.length
        ),
      560
    );
    return () => clearInterval(t);
  }, [phase]);

  // keyboard navigation
  useEffect(() => {
    if (phase !== "quiz" || !question) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (/^[1-9]$/.test(e.key)) {
        const opt = question.options[parseInt(e.key, 10) - 1];
        if (opt) {
          e.preventDefault();
          selectOption(question, opt.id);
        }
      } else if (e.key === "0") {
        e.preventDefault();
        skipQuestion();
      } else if (e.key === "Enter" && question.type === "multi") {
        if ((answers[question.id] ?? []).length > 0) {
          e.preventDefault();
          advance();
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, question, answers, index, selectOption, advance, goBack, skipQuestion]);

  const retake = () => {
    setAnswers({});
    setResult(null);
    setIndex(0);
    setDirection(1);
    setAiExplanation(null);
    setAiFailed(false);
    clearQuizProgress();
    setResume(null);
    clearProfile(); // explorer dialogs drop the "You" overlay
    setPhase("intro");
    // clear the deep-link param so a fresh quiz isn't shadowed by the old one
    try {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}#finder`
      );
    } catch {
      // non-critical
    }
  };

  /** jump back into a saved run (localStorage resume) */
  const resumeQuiz = useCallback(() => {
    if (!resume) return;
    setAnswers(resume.answers);
    setIndex(resume.index);
    setDirection(1);
    setResume(null);
    setPhase("quiz");
    toast({
      title: "Welcome back",
      description: `Picked up at question ${resume.index + 1} of ${QUIZ_QUESTIONS.length}.`,
    });
  }, [resume, toast]);

  /** drop the saved run and hide the offer */
  const discardResume = () => {
    clearQuizProgress();
    setResume(null);
  };

  // "R" resumes a saved run straight from the intro card
  useEffect(() => {
    if (phase !== "intro" || !resume) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        resumeQuiz();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, resume, resumeQuiz]);

  const viewOnGraph = () => {
    setHighlight(matches.map((m) => m.distro.id));
    document
      .getElementById("explore")
      ?.scrollIntoView({ behavior: "smooth" });
    toast({
      title: "Matches highlighted on the map",
      description: "Scroll over the bubbles glowing to compare.",
    });
  };

  const share = async () => {
    if (!top) return;
    const link = buildShareUrl(answers);
    const lines = [
      `DistroScope says my perfect Linux is ${top.distro.name} (${top.score}%)`,
      ...matches
        .slice(1, 3)
        .map((m) => `· ${m.distro.name} (${m.score}%)`),
      `See why — or find yours: ${link}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast({
        title: "Shareable link copied",
        description:
          "Anyone opening it lands straight on these results — answers included.",
      });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const saveImage = async () => {
    if (!top || matches.length === 0) return;
    const ok = await downloadShareCard(
      matches,
      window.location.origin,
      `distroscope-${top.distro.id}.png`
    );
    if (ok) {
      toast({
        title: "Share card saved",
        description: `A 1200×675 PNG of your match — post it anywhere.`,
      });
    } else {
      toast({
        title: "Could not render the card",
        description: "Your browser blocked the download — try the share link instead.",
        variant: "destructive",
      });
    }
  };

  const saveProfileCard = async () => {
    if (!top || matches.length === 0) return;
    const ok = await downloadProfileCard(
      matches,
      userProfile,
      window.location.origin,
      `distroscope-profile-${top.distro.id}.png`
    );
    if (ok) {
      toast({
        title: "Profile card saved",
        description: `Your trait radar vs ${top.distro.name} — a 1200×675 PNG.`,
      });
    } else {
      toast({
        title: "Could not render the card",
        description: "Your browser blocked the download — try the share link instead.",
        variant: "destructive",
      });
    }
  };

  const copyMarkdown = async () => {
    if (!top || matches.length === 0) return;
    const md = buildResultsMarkdown(
      matches,
      answers,
      buildShareUrl(answers)
    );
    const result = await copyToClipboard(
      md,
      `distroscope-results-${top.distro.id}.md`
    );
    if (result === "copied") {
      toast({
        title: "Markdown copied",
        description:
          "Full ranked list with reasons and your answers — paste it anywhere.",
      });
    } else if (result === "downloaded") {
      toast({
        title: "Markdown downloaded",
        description:
          "Clipboard is blocked here, so we saved the file instead — open it anywhere.",
      });
    } else {
      toast({
        title: "Could not copy",
        variant: "destructive",
      });
    }
  };

  const downloadJson = () => {
    if (!top || matches.length === 0) return;
    const ok = downloadResultsJson(
      matches,
      answers,
      buildShareUrl(answers),
      userProfile,
      `distroscope-results-${top.distro.id}.json`
    );
    if (ok) {
      toast({
        title: "JSON downloaded",
        description:
          "Answers, trait profile and full ranked matches — ready for scripts and spreadsheets.",
      });
    } else {
      toast({
        title: "Could not save the file",
        variant: "destructive",
      });
    }
  };

  const askOracle = async () => {
    if (aiLoading || aiExplanation) return;
    setAiLoading(true);
    setAiFailed(false);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error("explain failed");
      const data = (await res.json()) as { explanation: string };
      setAiExplanation(data.explanation);
    } catch {
      setAiFailed(true);
      toast({
        title: "The oracle is silent",
        description: "AI explanation is unavailable — the match reasons still stand.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const sendFeedback = async (helpful: boolean) => {
    if (!top) return;
    setFeedbackGiven(helpful ? "up" : "down");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ distroName: top.distro.name, helpful }),
      });
      window.dispatchEvent(new Event("distroscope:feedback-given"));
    } catch {
      // non-critical
    }
  };

  return (
    <section
      id="finder"
      className="relative mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-16 print:py-6 sm:px-6 sm:py-20 print:sm:py-6"
    >
      <header className="mx-auto max-w-2xl text-center">
        <SectionEyebrow index="02" label="Finder" icon={ListChecks} tone="fuchsia" align="center" />
        <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          {QUIZ_QUESTIONS.length} questions between you and{" "}
          <span className="text-gradient">your distro</span>
        </h2>
        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          Device, experience, priorities, quirks — the quiz listens to all of
          it and ranks all {DISTROS.length} distros for you.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-3xl print:mt-4">
        <AnimatePresence mode="wait">
          {/* ── Intro ── */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45 }}
              className="glass relative overflow-hidden rounded-3xl p-7 sm:p-9"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-violet-500/15 blur-[70px]" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-fuchsia-500/10 blur-[70px]" />

              <div className="relative flex flex-col items-center text-center">
                <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 shadow-[0_0_36px_rgb(192_132_252/0.4)]">
                  <Telescope className="size-7 text-white" />
                </span>
                <h3 className="mt-5 text-2xl font-bold tracking-tight">
                  Ready to meet your distro?
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {QUIZ_QUESTIONS.length} questions, roughly three minutes,
                  zero wrong answers. Your answers stay on this machine — we
                  only count the result, anonymously.
                </p>

                <div className="mt-7 grid w-full gap-3 sm:grid-cols-3">
                  {[
                    {
                      icon: MousePointerClick,
                      title: "Answer honestly",
                      text: "Device, habits, quirks — details matter",
                    },
                    {
                      icon: Sparkles,
                      title: `We score all ${DISTROS.length}`,
                      text: "17 weighted traits per distro",
                    },
                    {
                      icon: Trophy,
                      title: "Meet your match",
                      text: "Ranked results with real reasons",
                    },
                  ].map((step, i) => (
                    <div
                      key={step.title}
                      className="glass-soft rounded-2xl p-4 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <step.icon className="size-4 text-fuchsia-300" />
                        <p className="text-[13px] font-semibold">
                          {i + 1}. {step.title}
                        </p>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {step.text}
                      </p>
                    </div>
                  ))}
                </div>

                {/* resume offer — saved mid-quiz run from localStorage */}
                {resume && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative mt-6 flex w-full flex-col items-center gap-3 overflow-hidden rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] px-4 py-4 text-left sm:flex-row sm:items-center"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-300/25 bg-amber-400/10">
                      <History className="size-5 text-amber-300" />
                    </span>
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                      <p className="text-sm font-semibold">
                        You were halfway through
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Question {resume.index + 1} of {QUIZ_QUESTIONS.length}{" "}
                        · {Object.keys(resume.answers).length} answered · saved
                        on this device
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        onClick={resumeQuiz}
                        aria-keyshortcuts="r"
                        className="h-9 rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-4 text-[13px] font-medium text-amber-950 shadow-[0_6px_24px_rgb(251_191_36/0.35)] transition-transform hover:brightness-110 active:scale-[0.97]"
                      >
                        <RotateCcw className="size-3.5" />
                        Resume quiz
                        <kbd className="ml-1 rounded border border-amber-900/20 bg-white/25 px-1.5 py-0 font-mono text-[10px] font-bold">R</kbd>
                      </Button>
                      <button
                        type="button"
                        onClick={discardResume}
                        className="h-9 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Start fresh
                      </button>
                    </div>
                  </motion.div>
                )}

                <Button
                  onClick={() => setPhase("quiz")}
                  className="mt-8 h-12 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-7 text-[15px] font-medium shadow-[0_10px_36px_rgb(192_132_252/0.4)] transition-transform hover:brightness-110 hover:shadow-[0_10px_44px_rgb(192_132_252/0.6)] active:scale-[0.98]"
                >
                  <Sparkles className="size-4" />
                  Start the quiz
                </Button>
                <p className="mt-3 font-mono text-[11px] text-muted-foreground/70">
                  tip: keys 1–9 pick options · 0 skips · ← goes back · ? shows
                  all shortcuts
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Quiz ── */}
          {phase === "quiz" && question && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass relative overflow-hidden rounded-3xl p-5 sm:p-8"
            >
              {/* progress */}
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={index === 0}
                  className={cn(
                    "glass-soft flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all",
                    index === 0
                      ? "pointer-events-none opacity-30"
                      : "hover:bg-white/10 hover:text-foreground"
                  )}
                >
                  <ChevronLeft className="size-3.5" />
                  Back
                </button>
                <div className="flex flex-1 gap-1 px-2" aria-hidden>
                  {QUIZ_QUESTIONS.map((q, i) => {
                    const answered = (answers[q.id] ?? []).length > 0;
                    return (
                      <div
                        key={q.id}
                        title={`${i < index ? (answered ? "Answered" : "Skipped") : ""} ${i + 1}. ${q.title}`.trim()}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-all duration-300",
                          i === index
                            ? "animate-pulse-soft bg-gradient-to-r from-violet-400 to-fuchsia-400 shadow-[0_0_10px_rgb(232_121_249/0.55)]"
                            : i < index
                              ? answered
                                ? "bg-fuchsia-400/60"
                                : "bg-amber-400/35"
                              : "bg-white/[0.08]"
                        )}
                      />
                    );
                  })}
                </div>
                <p className="shrink-0 font-mono text-xs text-muted-foreground">
                  {index + 1}/{QUIZ_QUESTIONS.length}
                </p>
              </div>

              {/* question */}
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={question.id}
                  custom={direction}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-7"
                >
                  <div className="flex items-start gap-4">
                    <span className="glass-soft grid size-12 shrink-0 place-items-center rounded-2xl">
                      <DistroIcon
                        name={question.icon}
                        className="size-6 text-fuchsia-300"
                      />
                    </span>
                    <div className="min-w-0">
                      <h3 className="flex flex-wrap items-center gap-2 text-xl font-bold leading-snug tracking-tight sm:text-2xl">
                        <span className="text-balance">{question.title}</span>
                        {question.why && (
                          <TooltipProvider delayDuration={120}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label="Why we ask this"
                                  className="glass-soft group grid size-6 shrink-0 place-items-center rounded-full border-white/10 text-muted-foreground transition-all hover:border-fuchsia-300/40 hover:text-fuchsia-200"
                                >
                                  <Info className="size-3.5 transition-transform group-hover:scale-110" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-[290px] rounded-xl border-white/15 bg-popover/95 px-3.5 py-3 text-xs leading-relaxed text-foreground/90 shadow-[0_12px_40px_rgb(0_0_0/0.5)] backdrop-blur-xl"
                              >
                                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-300">
                                  <Sparkles className="size-3" />
                                  Why we ask
                                </p>
                                {question.why}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </h3>
                      {question.subtitle && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {question.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "mt-6 grid gap-2.5",
                      question.options.length > 5
                        ? "sm:grid-cols-2"
                        : "sm:grid-cols-2"
                    )}
                  >
                    {question.options.map((opt, i) => {
                      const selected = selectedIds.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => selectOption(question, opt.id)}
                          aria-pressed={selected}
                          className={cn(
                            "group relative flex w-full items-start gap-3.5 overflow-hidden rounded-2xl border p-4 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-fuchsia-300/70",
                            selected
                              ? "border-fuchsia-300/50 bg-fuchsia-400/10 shadow-[0_0_28px_rgb(232_121_249/0.14)]"
                              : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.07]"
                          )}
                        >
                          {selected && (
                            <motion.span
                              layoutId={`accent-${question.id}`}
                              className="absolute inset-y-2 left-0 w-1 rounded-full bg-gradient-to-b from-violet-400 to-fuchsia-400"
                            />
                          )}
                          <span
                            className={cn(
                              "glass-soft grid size-9 shrink-0 place-items-center rounded-xl transition-all duration-200 group-hover:border-white/25",
                              selected && "border-fuchsia-300/30"
                            )}
                          >
                            <DistroIcon
                              name={opt.icon}
                              className={cn(
                                "size-4.5 transition-all duration-200",
                                selected
                                  ? "text-fuchsia-200"
                                  : "text-muted-foreground group-hover:scale-110 group-hover:text-foreground"
                              )}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span
                                className={cn(
                                  "text-[15px] font-semibold leading-snug",
                                  selected && "text-fuchsia-100"
                                )}
                              >
                                {opt.label}
                              </span>
                            </span>
                            {opt.hint && (
                              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                                {opt.hint}
                              </span>
                            )}
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1.5">
                            <kbd className="hidden rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/60 sm:block">
                              {i + 1}
                            </kbd>
                            {question.type === "multi" && (
                              <span
                                className={cn(
                                  "grid size-5 place-items-center rounded-full border transition-all",
                                  selected
                                    ? "border-fuchsia-300/60 bg-fuchsia-400/25"
                                    : "border-white/15 bg-transparent"
                                )}
                              >
                                {selected && (
                                  <Check className="size-3 text-fuchsia-100" />
                                )}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* skip — single-select questions */}
                  {question.type === "single" && (
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <p className="hidden text-[11px] text-muted-foreground/60 sm:block">
                        No wrong answers — pick what fits best.
                      </p>
                      <button
                        type="button"
                        onClick={skipQuestion}
                        className="glass-soft ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-all hover:border-amber-300/30 hover:bg-amber-400/10 hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300/60"
                        aria-keyshortcuts="0"
                      >
                        <SkipForward className="size-3.5" />
                        Skip this question
                      </button>
                    </div>
                  )}

                  {/* multi footer */}
                  {question.type === "multi" && (
                    <div className="mt-5 flex min-h-11 items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        {selectedIds.length === 0
                          ? question.id === "usecase"
                            ? "Pick one to three — or skip"
                            : "Pick all that apply — or skip"
                          : `${selectedIds.length} selected${
                              selectedIds.length >= 3 ? " — that's the max" : ""
                            }`}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={skipQuestion}
                          className="glass-soft flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-all hover:border-amber-300/30 hover:bg-amber-400/10 hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300/60"
                          aria-keyshortcuts="0"
                        >
                          <SkipForward className="size-3.5" />
                          Skip
                        </button>
                        <AnimatePresence>
                          {selectedIds.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                            >
                              <Button
                                onClick={advance}
                                className="h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-sm font-medium shadow-[0_6px_24px_rgb(192_132_252/0.35)] transition-transform hover:brightness-110 active:scale-[0.97]"
                              >
                                {index === QUIZ_QUESTIONS.length - 1
                                  ? "See my results"
                                  : "Continue"}
                                <ArrowRight className="size-4" />
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Analyzing ── */}
          {phase === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden rounded-3xl p-8"
            >
              <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
              <div className="relative">
                <div className="size-24 animate-spin-slow rounded-full border-2 border-violet-400/20 border-t-fuchsia-400" />
                <div className="absolute inset-0 grid place-items-center">
                  <Telescope className="size-8 text-fuchsia-300" />
                </div>
              </div>
              <div className="relative mt-7 h-6 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={analyzingMsg}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22 }}
                    className="font-mono text-sm text-muted-foreground"
                  >
                    {ANALYZING_MESSAGES[analyzingMsg]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="relative mt-4 h-1 w-56 overflow-hidden rounded-full bg-white/5">
                <div className="shimmer-line h-full w-full" />
              </div>
            </motion.div>
          )}

          {/* ── Results ── */}
          {phase === "results" && top && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col"
            >
              {/* relaxed-mode banner — hard filters conflicted, compromises below */}
              {result?.relaxed && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-300/25 bg-gradient-to-r from-amber-500/[0.1] via-amber-400/[0.05] to-transparent p-4 sm:flex-row sm:items-center"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-300/30 bg-amber-400/10">
                    <TriangleAlert className="size-5 text-amber-300" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-amber-100">
                      Your must-haves conflict — showing the closest matches
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      No distro on the board satisfies every hard filter you set
                      (think 2 GB RAM + immutable + FSF-endorsed — that machine
                      doesn&apos;t exist yet). We relaxed them into scored
                      penalties; each match below shows exactly what it
                      compromises.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const firstHard = QUIZ_QUESTIONS.findIndex((q) =>
                        (answers[q.id] ?? []).some(
                          (id) =>
                            q.options.find((o) => o.id === id)
                              ?.hardRequirements
                        )
                      );
                      editAnswer(Math.max(0, firstHard));
                    }}
                    className="h-9 shrink-0 rounded-xl border-amber-300/30 bg-amber-400/10 px-3.5 text-xs font-medium text-amber-100 transition-all hover:border-amber-300/50 hover:bg-amber-400/20"
                  >
                    <PenLine className="size-3.5" />
                    Revise my must-haves
                  </Button>
                </motion.div>
              )}
              {/* hero match */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="glass card-sweep relative overflow-hidden rounded-3xl p-6 sm:p-8"
              >
                <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-fuchsia-500/15 blur-[80px]" />
                <div className="pointer-events-none absolute -bottom-28 -left-20 size-64 rounded-full bg-violet-500/10 blur-[80px]" />

                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                  <MatchRing value={top.score} size={116} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-300">
                      Your perfect match
                    </p>
                    <h3 className="mt-1 text-3xl font-bold tracking-tight">
                      {top.distro.name}
                    </h3>
                    <p className="mt-1 text-pretty text-sm text-muted-foreground">
                      {top.distro.tagline}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[
                        top.distro.family,
                        DIFFICULTY_LABELS[top.distro.difficulty - 1],
                        top.distro.releaseModel === "rolling"
                          ? "Rolling release"
                          : "Point release",
                        `${top.distro.packageManager} packages`,
                      ].map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                        >
                          {chip}
                        </span>
                      ))}
                      {top.compromises?.map((chip) => (
                        <span
                          key={chip}
                          title="A hard filter this distro doesn't satisfy"
                          className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-200"
                        >
                          <TriangleAlert className="size-3" />
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
                  {top.reasons.map((reason) => (
                    <div key={reason.title} className="glass-soft rounded-2xl p-4">
                      <p className="flex items-center gap-2 text-[13px] font-semibold">
                        <Sparkles className="size-3.5 shrink-0 text-fuchsia-300" />
                        {reason.title}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {reason.detail}
                      </p>
                    </div>
                  ))}
                </div>

                {/* AI oracle */}
                <AnimatePresence>
                  {(aiLoading || aiExplanation || aiFailed) && (
                    <motion.div
                      key="oracle"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.35 }}
                      className="relative mt-4"
                    >
                      <div className="rounded-2xl border border-fuchsia-300/20 bg-gradient-to-br from-violet-500/[0.08] via-fuchsia-500/[0.06] to-transparent p-4 sm:p-5">
                        <div className="flex items-center gap-2.5">
                          <span className="relative grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/70 to-fuchsia-500/70 shadow-[0_0_18px_rgb(232_121_249/0.35)]">
                            <Bot className="size-4.5 text-white" />
                            {aiLoading && (
                              <span className="absolute inset-0 animate-pulse-soft rounded-xl bg-fuchsia-400/20" />
                            )}
                          </span>
                          <p className="text-shimmer text-[13px] font-semibold tracking-wide">
                            {aiLoading
                              ? "Consulting the oracle…"
                              : "The oracle speaks"}
                          </p>
                          {aiLoading && (
                            <span className="ml-auto flex gap-1">
                              {[0, 1, 2].map((d) => (
                                <span
                                  key={d}
                                  className="size-1.5 animate-blink rounded-full bg-fuchsia-300"
                                  style={{ animationDelay: `${d * 0.22}s` }}
                                />
                              ))}
                            </span>
                          )}
                        </div>

                        {aiLoading ? (
                          <div className="mt-3 space-y-2">
                            <div className="shimmer-line h-3 w-[92%] rounded-full" />
                            <div className="shimmer-line h-3 w-[78%] rounded-full" />
                            <div className="shimmer-line h-3 w-[85%] rounded-full" />
                          </div>
                        ) : aiExplanation ? (
                          <div className="mt-3 space-y-2.5">
                            {aiExplanation
                              .split(/\n{2,}|\n/)
                              .map((p) => p.trim())
                              .filter(Boolean)
                              .map((p, i) => (
                                <motion.p
                                  key={i}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.15 + i * 0.25 }}
                                  className="text-pretty text-[13px] leading-relaxed text-foreground/85"
                                >
                                  {p}
                                </motion.p>
                              ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                            The oracle went quiet, but the match reasons above
                            still tell the story.{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setAiFailed(false);
                                void askOracle();
                              }}
                              className="font-medium text-fuchsia-300 underline decoration-fuchsia-300/40 underline-offset-2 transition-colors hover:text-fuchsia-200"
                            >
                              Try again
                            </button>
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!aiExplanation && !aiLoading && !aiFailed && (
                  <button
                    type="button"
                    onClick={() => void askOracle()}
                    className="group relative mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-fuchsia-300/25 bg-fuchsia-400/[0.04] px-4 py-3 text-[13px] font-medium text-fuchsia-200/90 transition-all duration-300 hover:border-fuchsia-300/50 hover:bg-fuchsia-400/10 hover:shadow-[0_0_24px_rgb(232_121_249/0.15)] print:hidden"
                  >
                    <Bot className="size-4 transition-transform duration-300 group-hover:scale-110" />
                    Ask the AI oracle why {top.distro.name} fits you
                  </button>
                )}

                <div className="relative mt-6 flex flex-wrap items-center gap-2.5 print:hidden">
                  <Button
                    asChild
                    className="h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 text-[13px] font-medium shadow-[0_6px_24px_rgb(192_132_252/0.35)] hover:brightness-110"
                  >
                    <a
                      href={top.distro.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-4" />
                      Visit {top.distro.name}
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toggleCompare(top.distro.id)}
                    className={cn(
                      "glass h-10 rounded-xl border-white/10 px-4 text-[13px] font-medium",
                      compare.includes(top.distro.id) &&
                        "border-fuchsia-300/40 bg-fuchsia-400/15 text-fuchsia-100"
                    )}
                  >
                    <GitCompare className="size-4" />
                    {compare.includes(top.distro.id)
                      ? "In compare tray"
                      : "Add to compare"}
                  </Button>

                  <div className="ml-auto flex items-center gap-1.5">
                    {feedbackGiven ? (
                      <p className="px-2 text-xs text-muted-foreground">
                        Thanks — signal received
                      </p>
                    ) : (
                      <>
                        <span className="mr-1 text-xs text-muted-foreground">
                          Good match?
                        </span>
                        <button
                          type="button"
                          onClick={() => sendFeedback(true)}
                          className="glass-soft grid size-9 place-items-center rounded-xl border-white/15 text-foreground/80 transition-all hover:scale-105 hover:border-emerald-300/40 hover:text-emerald-300"
                          aria-label="Yes, good match"
                        >
                          <ThumbsUp className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => sendFeedback(false)}
                          className="glass-soft grid size-9 place-items-center rounded-xl border-white/15 text-foreground/80 transition-all hover:scale-105 hover:border-rose-300/40 hover:text-rose-300"
                          aria-label="No, not for me"
                        >
                          <ThumbsDown className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* you vs match — trait alignment */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="glass card-sweep relative overflow-hidden rounded-3xl p-5 sm:p-6"
              >
                <div className="pointer-events-none absolute -right-20 -top-24 size-52 rounded-full bg-violet-500/10 blur-[70px]" />
                <div className="relative flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <RadarIcon className="size-3.5 text-fuchsia-300" />
                    Trait alignment
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    You vs {top.distro.name} — 8 of 17 traits shown
                  </p>
                </div>
                <div className="relative mt-4">
                  <ProfileRadar distro={top.distro} profile={userProfile} />
                </div>
              </motion.div>

              {/* runners-up */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {matches
                  .slice(1, 3)
                  .map(
                    (m: DistroMatch, i: number) =>
                      i < 2 && (
                        <motion.div
                          key={m.distro.id}
                          initial={{ opacity: 0, y: 24 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.5,
                            delay: 0.15 + i * 0.12,
                          }}
                          className="glass card-sweep relative cursor-default overflow-hidden rounded-3xl p-5 transition-colors hover:border-white/20 sm:p-6"
                        >
                          <div className="flex items-center gap-5">
                            <MatchRing value={m.score} size={72} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Runner-up #{i + 1}
                              </p>
                              <p className="mt-0.5 truncate text-lg font-bold tracking-tight">
                                {m.distro.name}
                              </p>
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {m.reasons[0]?.title ?? m.distro.tagline}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {m.distro.family}
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {DIFFICULTY_LABELS[m.distro.difficulty - 1]}
                              </span>
                              {m.compromises?.map((chip) => (
                                <span
                                  key={chip}
                                  title="A hard filter this distro doesn't satisfy"
                                  className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-200"
                                >
                                  <TriangleAlert className="size-2.5" />
                                  {chip}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleCompare(m.distro.id)}
                                className={cn(
                                  "glass-soft grid size-8 place-items-center rounded-lg border-white/15 text-foreground/80 transition-all hover:text-foreground",
                                  compare.includes(m.distro.id) &&
                                    "border-fuchsia-300/40 text-fuchsia-200"
                                )}
                                aria-label={`Add ${m.distro.name} to compare`}
                              >
                                <GitCompare className="size-3.5" />
                              </button>
                              <a
                                href={m.distro.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="glass-soft grid size-8 place-items-center rounded-lg border-white/15 text-foreground/80 transition-all hover:text-foreground"
                                aria-label={`Visit ${m.distro.name} website`}
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      )
                  )}
              </div>

              {/* beginner day-one kit — shown when the answers scream "newcomer" */}
              {isBeginner && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="relative mt-5 overflow-hidden rounded-3xl border border-amber-200/25 bg-gradient-to-br from-amber-500/[0.08] via-violet-500/[0.05] to-transparent p-5 sm:p-6"
                >
                  <div className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-amber-400/10 blur-[70px]" />
                  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-amber-200/25 bg-amber-400/10 shadow-[0_0_20px_rgb(251_191_36/0.15)]">
                      <Sprout className="size-5 text-amber-200" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/90">
                        New to Linux?
                      </p>
                      <p className="mt-0.5 text-[15px] font-bold tracking-tight">
                        Take the day-one kit with you
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        First update, Flathub, snapshots, and a hand-picked
                        starter app pack — about 15 minutes, GUI-first, works
                        on{" "}
                        <span className="font-medium text-foreground">
                          {top.distro.name}
                        </span>{" "}
                        and every other distro.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      <a
                        href={BEGINNER_REPO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/90 to-orange-400/90 px-4 py-2 text-xs font-semibold text-black shadow-[0_0_20px_rgb(251_191_36/0.22)] transition-transform duration-200 hover:scale-105"
                      >
                        Open the guide
                        <ExternalLink className="size-3.5" />
                      </a>
                      <a
                        href="#beginner-kit"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-foreground/85 transition-colors hover:border-amber-200/40 hover:text-foreground"
                      >
                        See the kit here
                        <ArrowRight className="size-3.5" />
                      </a>
                    </div>
                  </div>
                  <div className="relative mt-4 flex flex-wrap gap-1.5">
                    {BEGINNER_STEPS.slice(0, 4).map((s, i) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                      >
                        <span className="font-mono text-[10px] font-bold text-amber-200/80">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {s.title}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* the rest */}
              {matches.length > 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="glass mt-5 rounded-3xl p-4 sm:p-5"
                >
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Also worth a look
                  </p>
                  <div className="mt-1 divide-y divide-white/5">
                    {matches.slice(3).map((m, i) => (
                      <div
                        key={m.distro.id}
                        className="group/row flex items-center gap-3 rounded-xl px-1 py-3 transition-colors hover:bg-white/[0.035] sm:gap-4 sm:px-2"
                      >
                        <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground/60">
                          #{i + 4}
                        </span>
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            background: m.distro.color,
                            boxShadow: `0 0 8px ${m.distro.color}66`,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedDistro(m.distro)}
                          className="shrink-0 text-sm font-medium transition-colors hover:text-fuchsia-200"
                        >
                          {m.distro.name}
                        </button>
                        <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground sm:block">
                          {m.distro.tagline}
                        </span>
                        <div className="ml-auto flex shrink-0 items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDistro(m.distro)}
                            title={`Overlay your answers on ${m.distro.name}'s traits`}
                            className="hidden size-8 place-items-center rounded-lg text-muted-foreground/70 opacity-0 transition-all hover:bg-white/10 hover:text-fuchsia-200 group-hover/row:opacity-100 sm:grid"
                            aria-label={`Compare your profile against ${m.distro.name}`}
                          >
                            <Swords className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCompare(m.distro.id)}
                            className={cn(
                              "grid size-8 place-items-center rounded-lg text-muted-foreground/70 transition-all hover:bg-white/10 hover:text-foreground",
                              compare.includes(m.distro.id) &&
                                "text-fuchsia-200"
                            )}
                            aria-label={`Add ${m.distro.name} to compare`}
                          >
                            <GitCompare className="size-3.5" />
                          </button>
                          <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.06] sm:block">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${m.score}%` }}
                              transition={{
                                duration: 0.9,
                                delay: 0.5 + i * 0.1,
                              }}
                              className="h-full rounded-full bg-gradient-to-r from-violet-500/70 to-fuchsia-500/70"
                            />
                          </div>
                          <span className="font-mono text-xs text-fuchsia-200">
                            {m.score}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* your answers — editable summary */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="glass mt-5 overflow-hidden rounded-3xl"
              >
                <button
                  type="button"
                  onClick={() => setAnswersOpen((o) => !o)}
                  aria-expanded={answersOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.04] sm:px-5"
                >
                  <span className="flex items-center gap-2.5">
                    <ListChecks className="size-4 text-fuchsia-300" />
                    <span className="text-[13px] font-semibold tracking-tight">
                      Your answers
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {Object.keys(answers).length}/11
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {answersOpen ? "Hide" : "Review & tweak"}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 text-muted-foreground transition-transform duration-300",
                        answersOpen && "rotate-180"
                      )}
                    />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {answersOpen && (
                    <motion.div
                      key="answers-body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="grid gap-1.5 border-t border-white/[0.07] px-3 py-3 sm:grid-cols-2 sm:px-4">
                        {QUIZ_QUESTIONS.map((q, qi) => {
                          const picked = (answers[q.id] ?? [])
                            .map(
                              (oid) =>
                                q.options.find((o) => o.id === oid)?.label
                            )
                            .filter(Boolean) as string[];
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => editAnswer(qi)}
                              className="group flex items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-left transition-all hover:border-white/10 hover:bg-white/[0.05]"
                            >
                              <span className="w-5 shrink-0 font-mono text-[10px] text-muted-foreground/50">
                                {String(qi + 1).padStart(2, "0")}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[11px] font-medium text-muted-foreground">
                                  {q.title}
                                </span>
                                <span className="mt-0.5 block truncate text-xs font-semibold text-foreground/90">
                                  {picked.length
                                    ? picked.join(" · ")
                                    : "Skipped"}
                                </span>
                              </span>
                              <PenLine className="size-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-fuchsia-300" />
                            </button>
                          );
                        })}
                      </div>
                      <p className="border-t border-white/[0.07] px-5 py-2.5 text-[11px] text-muted-foreground/70">
                        Tap any answer to change it — the match updates once
                        you finish the run again.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* actions — hidden on paper; results speak for themselves */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="mt-6 flex flex-wrap items-center justify-center gap-2.5 print:hidden"
              >
                <Button
                  onClick={viewOnGraph}
                  className="h-11 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-sm font-medium shadow-[0_8px_30px_rgb(192_132_252/0.35)] hover:brightness-110"
                >
                  <MapPinned className="size-4" />
                  View on the graph
                </Button>
                <Button
                  variant="outline"
                  onClick={share}
                  className="glass h-11 rounded-xl border-white/10 px-5 text-sm font-medium text-foreground hover:bg-white/10 hover:text-foreground"
                >
                  <Share2 className="size-4" />
                  Share results
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void saveImage()}
                  title="Download a 1200×675 PNG card of your results"
                  className="glass group h-11 rounded-xl border-white/10 px-5 text-sm font-medium text-foreground transition-all hover:border-emerald-300/30 hover:bg-emerald-400/10 hover:text-emerald-100"
                >
                  <ImageDown className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" />
                  Save as image
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void saveProfileCard()}
                  title="Download a PNG card with your trait radar vs your top match"
                  className="glass group h-11 rounded-xl border-white/10 px-5 text-sm font-medium text-foreground transition-all hover:border-violet-300/30 hover:bg-violet-400/10 hover:text-violet-100"
                >
                  <RadarIcon className="size-4 transition-transform duration-300 group-hover:rotate-90" />
                  Save profile card
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadJson}
                  title="Download your answers, trait profile and ranked matches as JSON"
                  className="glass group h-11 rounded-xl border-white/10 px-5 text-sm font-medium text-foreground transition-all hover:border-teal-300/30 hover:bg-teal-400/10 hover:text-teal-100"
                >
                  <Braces className="size-4 transition-transform duration-300 group-hover:scale-110" />
                  Download JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void copyMarkdown()}
                  title="Copy the full ranked list, reasons and answers as Markdown"
                  className="glass group h-11 rounded-xl border-white/10 px-5 text-sm font-medium text-foreground transition-all hover:border-rose-300/30 hover:bg-rose-400/10 hover:text-rose-100"
                >
                  <ClipboardCopy className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  Copy Markdown
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  title="Print or save your results as PDF"
                  className="glass group h-11 rounded-xl border-white/10 px-5 text-sm font-medium text-foreground transition-all hover:border-amber-300/30 hover:bg-amber-400/10 hover:text-amber-100"
                >
                  <Printer className="size-4 transition-transform duration-300 group-hover:scale-110" />
                  Print / PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={retake}
                  className="glass h-11 rounded-xl border-white/10 px-5 text-sm font-medium text-foreground hover:bg-white/10 hover:text-foreground"
                >
                  <RotateCcw className="size-4" />
                  Retake quiz
                </Button>
              </motion.div>

              <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
                Matches are scored from 17 weighted traits against your {" "}
                {QUIZ_QUESTIONS.length} answers — see the graph above to
                explore the full field.
              </p>
            </motion.div>
          )}

          {/* ── Defensive: results phase with zero matches (should be
               unreachable thanks to relaxed fallback, but never blank) ── */}
          {phase === "results" && !top && (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass flex flex-col items-center rounded-3xl p-8 text-center sm:p-12"
            >
              <span className="grid size-14 place-items-center rounded-2xl border border-amber-300/25 bg-amber-400/10">
                <TriangleAlert className="size-6 text-amber-300" />
              </span>
              <h3 className="mt-5 text-xl font-bold tracking-tight">
                The oracle came back empty-handed
              </h3>
              <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
                Your answers filtered out every distro on the board — an
                impressively rare taste. Loosen a must-have or two and the
                universe opens right back up.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <Button
                  onClick={() => editAnswer(0)}
                  className="h-11 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-sm font-medium shadow-[0_8px_30px_rgb(192_132_252/0.35)] hover:brightness-110"
                >
                  <PenLine className="size-4" />
                  Tweak my answers
                </Button>
                <Button
                  variant="outline"
                  onClick={retake}
                  className="glass h-11 rounded-xl border-white/10 px-5 text-sm font-medium text-foreground hover:bg-white/10"
                >
                  <RotateCcw className="size-4" />
                  Start over
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DistroDialog
        distro={selectedDistro}
        open={!!selectedDistro}
        onOpenChange={(o) => !o && setSelectedDistro(null)}
        onNavigate={(d) => setSelectedDistro(d)}
        profile={phase === "results" ? userProfile : undefined}
      />
    </section>
  );
}
