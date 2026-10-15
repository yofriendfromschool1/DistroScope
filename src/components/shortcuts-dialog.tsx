"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard, ListChecks, Compass, Sparkles } from "lucide-react";

interface ShortcutRow {
  keys: string[];
  action: string;
}

const QUIZ_SHORTCUTS: ShortcutRow[] = [
  { keys: ["1", "–", "9"], action: "Choose an option" },
  { keys: ["0"], action: "Skip the current question" },
  { keys: ["Enter"], action: "Continue (multi-select questions)" },
  { keys: ["←"], action: "Go back one question" },
  { keys: ["R"], action: "Resume a saved run (intro screen)" },
];

const EXPLORER_SHORTCUTS: ShortcutRow[] = [
  { keys: ["S"], action: "Roll the surprise-me dice" },
  { keys: ["G"], action: "Switch to graph view" },
  { keys: ["T"], action: "Switch to table view" },
];

const ANYWHERE_SHORTCUTS: ShortcutRow[] = [
  { keys: ["Ctrl", "K"], action: "Open the command palette" },
  { keys: ["/"], action: "Open the command palette (quick)" },
  { keys: ["?"], action: "Toggle this shortcut sheet" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6.5 min-w-6.5 place-items-center rounded-lg border border-white/15 bg-white/[0.06] px-1.5 font-mono text-[11px] font-semibold text-foreground/90 shadow-[inset_0_-2px_0_rgb(255_255_255/0.07)]">
      {children}
    </kbd>
  );
}

function ShortcutGroup({
  icon: Icon,
  title,
  rows,
}: {
  icon: typeof Keyboard;
  title: string;
  rows: ShortcutRow[];
}) {
  return (
    <div className="glass-soft rounded-2xl p-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="size-3.5 text-fuchsia-300" />
        {title}
      </p>
      <ul className="mt-3 space-y-2.5">
        {rows.map((row) => (
          <li
            key={row.action}
            className="flex items-center justify-between gap-4 text-[13px]"
          >
            <span className="text-muted-foreground">{row.action}</span>
            <span className="flex shrink-0 items-center gap-1">
              {row.keys.map((k) =>
                k === "–" ? (
                  <span key="sep" className="text-muted-foreground/50">
                    {k}
                  </span>
                ) : (
                  <Kbd key={k}>{k}</Kbd>
                )
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("distroscope:open-shortcuts", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("distroscope:open-shortcuts", onOpen);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass-strong rounded-3xl p-0 sm:max-w-md">
        <div className="p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 shadow-[0_0_20px_rgb(192_132_252/0.4)]">
                <Keyboard className="size-4.5 text-white" />
              </span>
              Keyboard shortcuts
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px]">
              Fly through the quiz and the map without touching the mouse.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-3">
            <ShortcutGroup icon={ListChecks} title="Quiz" rows={QUIZ_SHORTCUTS} />
            <ShortcutGroup icon={Compass} title="Explorer" rows={EXPLORER_SHORTCUTS} />
            <ShortcutGroup icon={Sparkles} title="Anywhere" rows={ANYWHERE_SHORTCUTS} />
          </div>

          <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
            "?" opens this sheet anywhere · "/" or Ctrl+K searches every distro
            instantly
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** small client-side footer link that opens the shortcuts dialog */
export function ShortcutsHint() {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new Event("distroscope:open-shortcuts"))
      }
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      aria-keyshortcuts="?"
    >
      <Keyboard className="size-3.5" />
      Keyboard shortcuts
      <kbd className="hidden rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/60 sm:inline">
        ?
      </kbd>
    </button>
  );
}
