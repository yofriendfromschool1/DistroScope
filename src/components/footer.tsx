import { Github, Heart, Telescope } from "lucide-react";
import { ShortcutsHint } from "@/components/shortcuts-dialog";
import { PaletteHint } from "@/components/command-palette";

const INSPIRATION_LINKS = [
  {
    label: "Beginner-Linux-Apps",
    href: "https://github.com/yofriendfromschool1/Beginner-Linux-Apps",
  },
  {
    label: "Closest-Linux-Distros-to-OS",
    href: "https://github.com/yofriendfromschool1/Closest-Linux-Distros-to-OS",
  },
  {
    label: "distrochooser",
    href: "https://github.com/distrochooser/distrochooser",
  },
  {
    label: "distrofinder",
    href: "https://github.com/felagund1789/distrofinder",
  },
];

const EXPLORE_LINKS = [
  { label: "Graph explorer", href: "#explore" },
  { label: "Distro finder quiz", href: "#finder" },
  { label: "Beginner day-one kit", href: "#beginner-kit" },
  { label: "Community stats", href: "#stats" },
];

export function Footer() {
  return (
    <footer className="relative mt-auto border-t border-white/5 bg-white/[0.02] backdrop-blur-xl print:hidden">
      {/* gradient hairline — violet → fuchsia → amber echo of the navbar beam */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/30 to-transparent"
      />
      {/* soft top glow so the footer reads as "grounded" glass */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-violet-500/[0.04] to-transparent"
      />
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          {/* brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 shadow-[0_0_24px_rgb(192_132_252/0.35)]">
                <Telescope className="size-5 text-white" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight">
                Distro<span className="text-gradient">Scope</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              The glass map of the Linux universe. Hand-curated data on 52
              distros across 8 families, an interactive explorer, and a quiz
              that actually listens.
            </p>
            <p className="mt-4 font-mono text-[11px] text-muted-foreground/70">
              Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma
            </p>
          </div>

          {/* explore */}
          <div>
            <h3 className="text-sm font-semibold">Explore</h3>
            <ul className="mt-4 space-y-2.5">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="link-underline text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                Quick access
              </p>
              <PaletteHint />
            </div>
          </div>

          {/* inspiration */}
          <div>
            <h3 className="text-sm font-semibold">Inspired by</h3>
            <ul className="mt-4 space-y-2.5">
              {INSPIRATION_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Github className="size-3.5 transition-transform group-hover:-translate-y-0.5" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} DistroScope — not affiliated with any
            distribution or vendor. Distro names and marks belong to their
            owners.
          </p>
          <div className="flex items-center gap-5">
            <ShortcutsHint />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Made with
              <Heart className="size-3.5 fill-rose-400 text-rose-400" />
              and far too many distro hops
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
