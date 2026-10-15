# DistroScope

**Find the Linux distribution that actually fits you.**

DistroScope is an interactive distro finder that combines a visual scatter-plot
explorer, an 18-question matching quiz, side-by-side comparison, and a
day-one beginner kit — all wrapped in a glassmorphic, fully responsive,
single-page experience.

Inspired by [Closest-Linux-Distros-to-OS], [distrochooser], [distrofinder]
and the [Beginner-Linux-Apps] app catalog.

---

## Highlights

### Visual Graph Explorer

- **52 distributions** plotted as liquid-glass bubbles — position on any two
  of **17 trait axes** (ease of use, performance, privacy focus, gaming
  support, ARM support, NVIDIA friendliness, ...), bubble size = popularity,
  bubble color = family (Ubuntu / Debian / Arch / Fedora / RHEL / SUSE /
  Gentoo / Independent).
- **Axis presets** ("Ease & Control", "Old reliable hardware", "Fresh vs.
  stable", ...) plus free axis pickers.
- **Filters** by family, use-case tag, init system (systemd, OpenRC, runit,
  SysVinit, ...) and popularity — with live counts.
- **"Coming from..." OS similarity highlighter** — Windows, macOS, ChromeOS
  and more light up their closest look-alikes.
- **Distro detail dialog** — 17-trait stats, radar chart, pros & cons,
  init-system note, stewardship, AI posture.
- **Compare tray** — pick up to 3 distros, overlay their radar charts,
  share via deep links (`?c=arch-linux,linux-mint,fedora`).

### Distro Table View

- Same 52 distros as a sortable, fuzzy-searchable table.
- **Column chooser** with Compact / Standard / Everything presets,
  persisted to `localStorage`.
- Keyboard-navigable rows (Tab + Enter opens the detail dialog).
- **Print-ready**: switch to table view and print — only the table comes
  out, paginated cleanly across pages.

### The Finder (Matching Quiz)

- **18 questions**: device, experience, use cases, RAM budget, privacy,
  update style, gaming, desktop look & feel, app store preference,
  **init system** (hard "must avoid systemd" filter), **immutable
  base**, **FOSS purity**, **dual boot**, **governance**, and
  **AI-contribution policy** for the repos.
- Auto-advance single-select, multi-select, skip, progress bar, answer
  review & edit.
- **Results**: % match rings, ranked runner-ups, human-readable reasons
  ("systemd-free, guaranteed", "human-reviewed contributions", ...),
  trait-profile radar, and a contextual beginner card.
- **Graceful relaxation**: if your must-haves conflict and eliminate every
  distro, the engine retries with hard requirements downgraded to scored
  penalties and honestly labels each **compromise** ("needs 4 GB RAM",
  "systemd init", "traditional (mutable) base").
- **Deep links**: your whole answer set round-trips in the URL (`?q=...`),
  backward-compatible as questions are appended.
- **Exports**: PNG share card, Markdown, and a full JSON document
  (answers, expressed trait profile, ranked matches with all metadata).

### Compare Mode & Community Stats

- Compare dialog: 3-way trait-by-trait comparison with radar overlay and
  per-distro tinted chips.
- **Community duel arena**: the most-compared pairs, recorded to the
  database (deduped per browser) and surfaced as a live panel.
- Stats strip: quiz counter, 14-day daily pulse chart, family heat grid
  (arrow-key navigable), weekly trending distros.

### Beginner Day-One Kit

- Interactive **5-step first-day checklist** with progress persistence
  (reload-safe, hydration-safe).
- Real terminal blocks with per-step **Copy buttons** — update commands
  per distro family, Flathub setup, Flatseal/Warehouse/Timeshift
  installs, and the setup script from the
  [Beginner-Linux-Apps] repository.
- **12 starter apps** — click to copy the Flatpak ID.
- Three "unsung heroes" (Flatseal, Warehouse, Timeshift) highlighted.

### Power-User Polish

- **Command palette** (`/` or `Ctrl+K`): jump to any distro, section, or
  action.
- **Shortcuts dialog** (`?`): every hotkey documented in-app.
- Generated **OG share images** (`/api/og`) for links and quiz results.
- Back-to-top button, scroll deep links, sticky footer, reduced-motion
  aware animations, print styles.
- Dark glassmorphic theme (violet / fuchsia / rose / amber accents),
  mobile-first responsive down to ~360 px with zero horizontal scroll.

---

## Tech Stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Framework  | [Next.js 16] (App Router) + React 19 + TypeScript 5           |
| Styling    | Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons          |
| Animation  | Framer Motion                                                 |
| Charts     | Recharts                                                      |
| Database   | Prisma ORM + SQLite                                           |
| Validation | Zod                                                           |
| AI (opt.)  | z-ai-web-dev-sdk — optional "oracle" layer, degrades gracefully when unconfigured |

No auth, no external services — the dataset, engine and UI are fully
self-contained; SQLite is the only stateful dependency.

---

## Getting Started

### Prerequisites

- [Bun] (or Node.js 20+ with npm/pnpm — adjust commands accordingly)
- A copy of this repository

### Setup

```bash
# 1. Install dependencies
bun install

# 2. Point DATABASE_URL at a local SQLite file (absolute path works best)
#    e.g. DATABASE_URL="file:/absolute/path/to/repo/db/custom.db"
echo "DATABASE_URL=file:$(pwd)/db/custom.db" > .env

# 3. Create the database schema (QuizSession / DistroFeedback / CompareEvent)
bun run db:push

# 4. Start the dev server on http://localhost:3000
bun run dev
```

### Scripts

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `bun run dev`       | Dev server on port 3000 (logs to `dev.log`)   |
| `bun run lint`      | ESLint (Next.js + React Compiler rules)       |
| `bun run build`     | Production build (standalone output)          |
| `bun run start`     | Run the production build                      |
| `bun run db:push`   | Push the Prisma schema to SQLite              |
| `bun run db:generate` | Regenerate the Prisma client                |
| `bun run db:reset`  | Reset the database (migrate reset)            |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                 # The single page: Navbar → Hero → Stats →
│   │                            #   GraphExplorer → Quiz → BeginnerKit → Footer
│   ├── layout.tsx               # Metadata, OG defaults, fonts
│   ├── globals.css              # Design system (glass tokens, oklab rings)
│   └── api/
│       ├── match/               # POST — quiz answers → ranked matches
│       ├── distros/             # GET  — the full dataset
│       ├── stats/               # GET  — community stats (quizzes, trending, duels)
│       ├── compare/             # POST — record a compare event
│       ├── feedback/            # POST — thumbs up/down on a match
│       ├── explain/             # POST — explain one match in depth
│       └── og/                  # GET  — generated OG share images (1200x630)
├── components/                  # GraphExplorer, QuizSection, DistroTable,
│   │                            #   DistroDialog, CompareDialog, BeginnerPack,
│   │                            #   CommandPalette, ShortcutsDialog, StatsStrip, ...
│   └── ui/                      # shadcn/ui primitives
├── data/
│   ├── distros.ts               # 52 distros: 17-trait vectors, families,
│   │                            #   init systems, governance, AI policy, tags
│   ├── questions.ts             # 18 quiz questions + option weights
│   └── beginner-pack.ts         # Day-one steps + starter apps (repo-backed)
├── lib/
│   ├── matching.ts              # Two-pass scoring engine (strict → relaxed)
│   ├── similarity.ts            # OS-similarity lookups
│   ├── fuzzy.ts                 # Fuzzy search for the table/palette
│   ├── quiz-url.ts              # ?q= positional deep-link codec
│   ├── share-card.ts            # PNG share-card renderer
│   ├── json-export.ts           # Full JSON results export
│   ├── markdown-export.ts       # Markdown results export
│   └── db.ts                    # Prisma client singleton
└── prisma/
    └── schema.prisma            # QuizSession / DistroFeedback / CompareEvent
```

---

## The Matching Engine

Each distro carries a **17-dimension trait vector** (0–100 per trait) plus
metadata (family, package manager, init system, release model, governance,
AI policy, use-case tags, RAM requirements, ...).

The quiz converts your answers into a **weighted trait profile** with:

- **Hard filters** — minimum RAM ceiling, init-system allowlist
  ("must avoid systemd"), immutable base, FOSS purity. Distros that fail a
  hard filter are eliminated entirely.
- **Soft preferences** — bonuses for matching governance style, AI-posture,
  init preference, desktop look-alikes, update cadence, and the trait
  directions each answer expresses.

**Two-pass scoring**: a strict pass runs first; if it eliminates every
distro (e.g. *ancient laptop* + *immutable-must* + *FOSS-strict*), the
engine retries with hard filters downgraded to scored penalties and
returns the closest matches flagged `relaxed: true` with human-readable
**compromise labels** — so you always get an answer, never a blank screen.

Every match ships with generated **reason strings** explaining *why* it
ranked ("Lightest footprint in its family", "Community-governed project",
"AI-forward project", ...).

---

## API Reference

| Endpoint            | Method | Purpose                                        |
| ------------------- | ------ | ---------------------------------------------- |
| `/api/match`        | POST   | `{ answers }` → ranked matches (strict or relaxed) |
| `/api/distros`      | GET    | Full 52-distro dataset                         |
| `/api/stats`        | GET    | Quiz count, 14-day pulse, family heat, trending, duels |
| `/api/compare`      | POST   | `{ ids: [2-3 distro ids] }` → records a compare event |
| `/api/feedback`     | POST   | `{ distroName, helpful }` → thumbs feedback    |
| `/api/explain`      | POST   | In-depth explanation for one match             |
| `/api/og`           | GET    | Generated OG images (`?m=` match card, `?c=` compare card) |

---

## Keyboard Shortcuts

| Key                  | Action                              |
| -------------------- | ----------------------------------- |
| `/` or `Ctrl+K`      | Open the command palette            |
| `?`                  | Open the shortcuts dialog           |
| `1`–`4` / `0`        | Select quiz answer / skip           |
| Arrow keys           | Navigate stats grids & duel arena   |
| `Tab` + `Enter`      | Navigate and open table rows        |

---

## Data Notes

- Trait scores, governance labels, and AI-posture fields are **curated
  editorial snapshots** — opinionated by nature and maintained by hand.
  The AI-posture data in particular evolves quickly; the UI hedges
  accordingly ("public posture" wording, not absolute claims).
- Distro metadata is kept **timeless** where possible (no version numbers
  or dates in descriptions).
- Adding a distro = one entry in `src/data/distros.ts` with its full
  trait vector; graph, table, filters, quiz matching, and compare all
  pick it up automatically.

---

## Roadmap Ideas

- i18n (next-intl is already in the tree)
- Governance / AI-posture filter chips in the explorer
- "Vs-you" trait radar inside table rows
- Most-compared OG cards, community-stats JSON export
- Additional distros (RebornOS, blendOS, Nitrux) and an ARM/phone category
- Accessibility focus-order audit across dialogs

---

## Acknowledgments

- [Beginner-Linux-Apps] by [@yofriendfromschool1] — the beginner kit's
  steps and starter apps are sourced from this repository.
- [Closest-Linux-Distros-to-OS] — inspiration for the OS-similarity view.
- [distrochooser] and [distrofinder] — inspiration for the quiz.

All product names, logos, and brands are property of their respective
owners.

---

## License

This project is provided as-is for educational and demonstrative purposes.
Individual Linux distributions and their assets remain the property of
their respective projects and trademark holders.

<!-- Links -->
[Next.js 16]: https://nextjs.org
[Bun]: https://bun.sh
[Closest-Linux-Distros-to-OS]: https://github.com/yofriendfromschool1/Closest-Linux-Distros-to-OS
[distrochooser]: https://github.com/distrochooser/distrochooser
[distrofinder]: https://github.com/felagund1789/distrofinder
[Beginner-Linux-Apps]: https://github.com/yofriendfromschool1/Beginner-Linux-Apps
[@yofriendfromschool1]: https://github.com/yofriendfromschool1
