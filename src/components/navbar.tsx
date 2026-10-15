"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Keyboard, Menu, Sparkles, Telescope } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PaletteHint } from "@/components/command-palette";
import { cn } from "@/lib/utils";

const subscribeNoop = () => () => {};

/** true only after hydration — lint-safe mount gate (no setState in effect) */
const useMounted = () =>
  useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

const NAV_LINKS = [
  { href: "#explore", label: "Explorer" },
  { href: "#finder", label: "Distro Finder" },
  { href: "#beginner-kit", label: "Beginner Kit" },
  { href: "#stats", label: "Community" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const mounted = useMounted();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 px-3 transition-all duration-500 print:hidden sm:px-6",
        scrolled ? "pt-2 sm:pt-2.5" : "pt-3 sm:pt-4"
      )}
    >
      <nav
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-2xl border px-3 transition-all duration-500 sm:px-4",
          scrolled
            ? "glass-strong h-12"
            : "h-14 border-white/5 bg-white/[0.03] backdrop-blur-md"
        )}
      >
        <a href="#top" className="group flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 shadow-[0_0_24px_rgb(192_132_252/0.45)] transition-all duration-500 group-hover:rotate-6 group-hover:scale-105",
              scrolled ? "size-8" : "size-9"
            )}
          >
            <Telescope className={cn("text-white transition-all duration-500", scrolled ? "size-4.5" : "size-5")} />
          </span>
          <span
            className={cn(
              "truncate font-semibold tracking-tight transition-all duration-500",
              scrolled ? "text-sm" : "text-[15px]"
            )}
          >
            Distro<span className="text-gradient">Scope</span>
          </span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <PaletteHint />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              window.dispatchEvent(new Event("distroscope:open-shortcuts"))
            }
            className="glass-soft hidden size-9 rounded-xl text-muted-foreground transition-all hover:text-foreground sm:inline-flex"
            aria-label="Keyboard shortcuts (press ?)"
            aria-keyshortcuts="?"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="size-4" />
          </Button>
          <Button
            asChild
            size="sm"
            className="hidden h-9 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 font-medium shadow-[0_6px_24px_rgb(192_132_252/0.35)] transition-all hover:brightness-110 hover:shadow-[0_6px_32px_rgb(192_132_252/0.55)] sm:inline-flex"
          >
            <a href="#finder">
              <Sparkles className="size-4" />
              Find my distro
            </a>
          </Button>

          {/* Mobile menu — mounted post-hydration: Radix useId() can diverge
              between streamed SSR and client (flaky aria-controls mismatch),
              and this button is md:hidden anyway, so SSR gains nothing. */}
          {mounted && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-xl md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                aria-describedby={undefined}
                className="glass-strong w-72 border-white/10"
              >
                <SheetTitle className="flex items-center gap-2.5 px-2 text-[15px] font-semibold tracking-tight">
                  <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400">
                    <Telescope className="size-4 text-white" />
                  </span>
                  Distro<span className="text-gradient -ml-1.5">Scope</span>
                </SheetTitle>
                <div className="mt-8 flex flex-col gap-1.5 px-2">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="rounded-xl px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  ))}
                  <div className="mt-3 px-1">
                    <PaletteHint className="w-full justify-start" />
                  </div>
                  <a
                    href="#finder"
                    onClick={() => setOpen(false)}
                    className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 text-sm font-medium text-white shadow-[0_6px_24px_rgb(192_132_252/0.35)]"
                  >
                    <Sparkles className="size-4" />
                    Find my distro
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </nav>

      {/* scroll progress beam */}
      <div
        className="pointer-events-none absolute inset-x-4 top-full h-px overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full origin-left bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300 transition-transform duration-150 ease-out"
          style={{
            transform: `scaleX(${progress})`,
            opacity: scrolled ? 1 : 0,
          }}
        />
      </div>
    </header>
  );
}
