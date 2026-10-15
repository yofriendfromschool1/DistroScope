"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Compass,
  Dices,
  Keyboard,
  LayoutGrid,
  ListChecks,
  Search,
  Sparkles,
  Sprout,
  Table2,
  Telescope,
  Users,
} from "lucide-react";
import { DISTROS, FAMILY_META } from "@/data/distros";
import { QUIZ_QUESTIONS } from "@/data/questions";
import { fuzzyScore } from "@/lib/fuzzy";
import type { Distro } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Global ⌘K / Ctrl+K command palette.
 * Talks to the rest of the app through window events (same pattern as
 * distrscope:open-shortcuts), so it stays decoupled from the section tree.
 */

type PaletteAction = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ElementType;
  iconClass?: string;
  shortcut?: string;
  run: () => void;
};

function jumpTo(hash: string) {
  const el = document.querySelector(hash);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  else window.location.hash = hash;
}

/** true when the given node is somewhere a user would type text */
function isTypingTarget(node: EventTarget | null): boolean {
  return (
    node instanceof HTMLInputElement ||
    node instanceof HTMLTextAreaElement ||
    (node instanceof HTMLElement && node.isContentEditable)
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      // "/" opens the palette too — but never while typing somewhere
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        !isTypingTarget(e.target) &&
        !isTypingTarget(document.activeElement)
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("distroscope:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("distroscope:open-palette", onOpen);
    };
  }, []);

  const actions = useMemo<PaletteAction[]>(
    () => [
      {
        id: "quiz",
        label: "Take the distro quiz",
        hint: `${QUIZ_QUESTIONS.length} questions, ~3 minutes`,
        icon: Sparkles,
        iconClass: "text-fuchsia-300",
        run: () => jumpTo("#finder"),
      },
      {
        id: "beginner-kit",
        label: "Open the beginner day-one kit",
        hint: "First steps + starter apps",
        icon: Sprout,
        iconClass: "text-amber-300",
        run: () => jumpTo("#beginner-kit"),
      },
      {
        id: "explore",
        label: "Explore the distro graph",
        hint: "Bubble map + filters",
        icon: Compass,
        iconClass: "text-violet-300",
        run: () => jumpTo("#explore"),
      },
      {
        id: "stats",
        label: "See community stats",
        hint: "Live pulse + verdicts",
        icon: Users,
        iconClass: "text-amber-300",
        run: () => jumpTo("#stats"),
      },
      {
        id: "view-graph",
        label: "Switch explorer to graph view",
        icon: LayoutGrid,
        iconClass: "text-violet-300",
        shortcut: "G",
        run: () =>
          window.dispatchEvent(
            new CustomEvent("distroscope:set-view", { detail: "graph" })
          ),
      },
      {
        id: "view-table",
        label: "Switch explorer to table view",
        icon: Table2,
        iconClass: "text-violet-300",
        shortcut: "T",
        run: () =>
          window.dispatchEvent(
            new CustomEvent("distroscope:set-view", { detail: "table" })
          ),
      },
      {
        id: "surprise",
        label: "Roll the surprise-me dice",
        hint: "Random distro from your filters",
        icon: Dices,
        iconClass: "text-amber-300",
        shortcut: "S",
        run: () => window.dispatchEvent(new Event("distroscope:surprise")),
      },
      {
        id: "shortcuts",
        label: "Show keyboard shortcuts",
        icon: Keyboard,
        iconClass: "text-fuchsia-300",
        shortcut: "?",
        run: () =>
          window.dispatchEvent(new Event("distroscope:open-shortcuts")),
      },
    ],
    []
  );

  const openDistro = (d: Distro) => {
    window.dispatchEvent(
      new CustomEvent("distroscope:open-distro", { detail: d.id })
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="glass-strong overflow-hidden rounded-3xl p-0 sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>
            Search distros and jump anywhere on DistroScope.
          </DialogDescription>
        </DialogHeader>
        <Command
          className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group]]:px-2 [&_[cmdk-group]]:pb-2 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5"
          filter={(value, search) => fuzzyScore(value, search)}
        >
          <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-4">
            <Search className="size-4.5 shrink-0 text-fuchsia-300/80" />
            <CommandInput
              placeholder={`Search ${DISTROS.length} distros — fuzzy works (try “lmint”)…`}
              className="placeholder:text-muted-foreground/60 text-[14px]"
            />
            <kbd className="hidden shrink-0 rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 font-mono text-[10px] font-semibold text-muted-foreground/70 sm:block">
              ESC
            </kbd>
          </div>
          <CommandList className="scrollbar-slim max-h-[380px] px-1 py-2">
            <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
              <Telescope className="mx-auto mb-2 size-6 text-muted-foreground/40" />
              Nothing in this universe matches that.
            </CommandEmpty>

            <CommandGroup heading="Actions">
              {actions.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`action ${a.label}`}
                  onSelect={() => {
                    setOpen(false);
                    a.run();
                  }}
                  className="gap-3 rounded-xl text-[13.5px] data-[selected=true]:bg-white/[0.07] data-[selected=true]:text-foreground"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.05]">
                    <a.icon className={cn("size-4", a.iconClass)} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.label}</span>
                    {a.hint && (
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {a.hint}
                      </span>
                    )}
                  </span>
                  {a.shortcut && <CommandShortcut>{a.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="my-1 bg-white/[0.07]" />

            <CommandGroup heading="Distros">
              {DISTROS.map((d) => (
                <CommandItem
                  key={d.id}
                  value={`distro ${d.name} ${d.tagline} ${d.family} ${d.basedOn ?? ""}`}
                  onSelect={() => {
                    setOpen(false);
                    openDistro(d);
                  }}
                  className="gap-3 rounded-xl text-[13.5px] data-[selected=true]:bg-white/[0.07] data-[selected=true]:text-foreground"
                >
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg font-mono text-[10px] font-bold"
                    style={{
                      background: `${d.color}22`,
                      color: d.color,
                      boxShadow: `inset 0 0 0 1px ${d.color}40`,
                    }}
                  >
                    {d.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-medium">{d.name}</span>
                      <span className="shrink-0 truncate text-[10px] uppercase tracking-wider text-muted-foreground/60">
                        {d.family}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/70">
                      {d.tagline}
                    </span>
                  </span>
                  <span
                    className="ml-auto hidden shrink-0 font-mono text-[10px] text-muted-foreground/50 sm:block"
                    aria-hidden="true"
                  >
                    ↵
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-2.5 text-[10.5px] text-muted-foreground/60">
            <span className="flex items-center gap-1.5">
              <ListChecks className="size-3" />
              {DISTROS.length} distros · {Object.keys(FAMILY_META).length}{" "}
              families · fuzzy search on
            </span>
            <span className="font-mono">↑↓ navigate · ↵ open</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/** navbar / footer trigger button */
export function PaletteHint({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("distroscope:open-palette"))}
      aria-label="Open command palette (Ctrl+K)"
      aria-keyshortcuts="Control+K"
      className={cn(
        "group inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] text-muted-foreground transition-all hover:border-fuchsia-300/30 hover:bg-white/[0.08] hover:text-foreground",
        compact
          ? "h-9 w-9 justify-center"
          : "h-9 px-3 text-[13px]",
        className
      )}
    >
      <Search className="size-4 shrink-0 transition-colors group-hover:text-fuchsia-300" />
      {!compact && (
        <>
          <span className="hidden md:inline">Search distros</span>
          <kbd className="ml-1 hidden rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/70 md:inline">
            ⌘K
          </kbd>
          <kbd className="ml-1 rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/70 md:hidden">
            /
          </kbd>
        </>
      )}
    </button>
  );
}
