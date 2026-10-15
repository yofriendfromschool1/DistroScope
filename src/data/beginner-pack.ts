// ─────────────────────────────────────────────────────────────
// DistroScope — beginner day-one kit
// Curated companion content based on the community repo
// Beginner-Linux-Apps by @yofriendfromschool1.
// ─────────────────────────────────────────────────────────────

export const BEGINNER_REPO_URL =
  "https://github.com/yofriendfromschool1/Beginner-Linux-Apps";

export const BEGINNER_REPO_OWNER = "yofriendfromschool1";

export interface BeginnerStep {
  id: string;
  /** lucide icon name — must exist in the ICONS registry */
  icon: string;
  title: string;
  detail: string;
  /** mono lines shown as a copyable terminal block (verbatim, from the repo) */
  commands?: string[];
  /** optional caption under the terminal block */
  commandNote?: string;
  /** approx time for this step */
  time: string;
}

/** The repo's five first steps, in order. */
export const BEGINNER_STEPS: BeginnerStep[] = [
  {
    id: "update",
    icon: "RefreshCw",
    title: "Update your system",
    detail:
      "Before installing anything, run your distro's updater (Software Updater, Update Manager, Discover, App Center…) or the one-liner for your family below. Always first — especially on rolling distros.",
    commands: [
      "sudo apt update && sudo apt upgrade   # Ubuntu · Mint · Debian",
      "sudo dnf upgrade                      # Fedora",
      "sudo pacman -Syu                      # Arch · EndeavourOS",
      "sudo zypper dup                       # openSUSE",
    ],
    commandNote:
      "The repo's setup.sh auto-detects your distro and runs the right one for you.",
    time: "~3 min",
  },
  {
    id: "flathub",
    icon: "Store",
    title: "Enable Flathub",
    detail:
      "Flathub is the app store that works on every distro, so you're never limited by your distro's repositories. One command or one toggle in your software store.",
    commands: [
      "flatpak remote-add --if-not-exists flathub \\",
      "  https://dl.flathub.org/repo/flathub.flatpakrepo",
    ],
    commandNote: "Same command everywhere — then reboot so your store picks it up.",
    time: "~2 min",
  },
  {
    id: "flatseal",
    icon: "ShieldCheck",
    title: "Install Flatseal + Warehouse",
    detail:
      "Flatseal manages what each Flatpak app is allowed to access; Warehouse manages and cleans your Flatpaks. Both are GUI, both are lifesavers.",
    commands: [
      "flatpak install flathub com.github.tchx84.Flatseal",
      "flatpak install flathub io.github.flattool.Warehouse",
    ],
    time: "~2 min",
  },
  {
    id: "timeshift",
    icon: "History",
    title: "Set up Timeshift snapshots",
    detail:
      "A 5-minute safety net so a bad update never means a reinstall. Take a snapshot before any big change and you can always roll back.",
    commands: [
      "sudo apt install timeshift   # Debian family",
      "yay -S timeshift             # Arch family (AUR)",
    ],
    commandNote: "On openSUSE, use the built-in snapper instead.",
    time: "~5 min",
  },
  {
    id: "apps",
    icon: "Download",
    title: "Install your starter apps",
    detail:
      "Grab the essentials below from your software store, or clone the repo and let setup.sh do steps 1–4 (and optionally the whole app pack) in one go.",
    commands: [
      "git clone https://github.com/yofriendfromschool1/Beginner-Linux-Apps.git",
      "cd Beginner-Linux-Apps",
      "chmod +x setup.sh",
      "sudo ./setup.sh",
    ],
    commandNote: "Idempotent — safe to re-run, skips what's already installed.",
    time: "~5 min",
  },
];

export interface BeginnerApp {
  id: string;
  name: string;
  category: string;
  /** lucide icon name */
  icon: string;
  flatpakId: string;
  why: string;
  /** highlighted as a must-have utility rather than an end-user app */
  essentialTool?: boolean;
}

/** The repo's recommended starter apps (Flatpak IDs work on every distro). */
export const BEGINNER_APPS: BeginnerApp[] = [
  {
    id: "firefox",
    name: "Firefox",
    category: "Browser",
    icon: "Globe",
    flatpakId: "org.mozilla.firefox",
    why: "Privacy-respecting, extension-rich default",
  },
  {
    id: "libreoffice",
    name: "LibreOffice",
    category: "Office",
    icon: "FileText",
    flatpakId: "org.libreoffice.LibreOffice",
    why: "Opens & saves Word, Excel and PowerPoint files",
  },
  {
    id: "vlc",
    name: "VLC",
    category: "Media player",
    icon: "Play",
    flatpakId: "org.videolan.VLC",
    why: "Plays literally every audio/video format",
  },
  {
    id: "gimp",
    name: "GIMP",
    category: "Image editor",
    icon: "Image",
    flatpakId: "org.gimp.GIMP",
    why: "Photoshop-class editing, free",
  },
  {
    id: "joplin",
    name: "Joplin",
    category: "Notes",
    icon: "NotebookPen",
    flatpakId: "net.cozyp.Joplin",
    why: "Markdown notes with sync",
  },
  {
    id: "thunderbird",
    name: "Thunderbird",
    category: "Email",
    icon: "Mail",
    flatpakId: "org.mozilla.Thunderbird",
    why: "Full-featured desktop mail client",
  },
  {
    id: "discord",
    name: "Discord",
    category: "Chat",
    icon: "MessageCircle",
    flatpakId: "com.discordapp.Discord",
    why: "Voice & text chat for communities and gaming",
  },
  {
    id: "telegram",
    name: "Telegram",
    category: "Chat",
    icon: "Send",
    flatpakId: "org.telegram.desktop",
    why: "Fast, cross-platform messaging",
  },
  {
    id: "spotify",
    name: "Spotify",
    category: "Music",
    icon: "Music",
    flatpakId: "com.spotify.Client",
    why: "Streaming music, sandboxed",
  },
  {
    id: "obs",
    name: "OBS Studio",
    category: "Recording",
    icon: "Video",
    flatpakId: "com.obsproject.Studio",
    why: "Screen recording & live streaming",
  },
  {
    id: "steam",
    name: "Steam",
    category: "Games",
    icon: "Gamepad2",
    flatpakId: "com.valvesoftware.Steam",
    why: "Steam + Proton for Windows games",
  },
  {
    id: "vscode",
    name: "VS Code",
    category: "Code editor",
    icon: "Code",
    flatpakId: "com.visualstudio.code",
    why: "The default editor for developers",
  },
  {
    id: "flatseal",
    name: "Flatseal",
    category: "Flatpak tool",
    icon: "ShieldCheck",
    flatpakId: "com.github.tchx84.Flatseal",
    why: "Must-have: control what each app can access",
    essentialTool: true,
  },
  {
    id: "warehouse",
    name: "Warehouse",
    category: "Flatpak tool",
    icon: "Box",
    flatpakId: "io.github.flattool.Warehouse",
    why: "Manage remotes, clean leftovers, bulk ops",
    essentialTool: true,
  },
  {
    id: "timeshift",
    name: "Timeshift",
    category: "Snapshots",
    icon: "History",
    flatpakId: "native package",
    why: "Roll back your whole system if an update goes wrong",
    essentialTool: true,
  },
];

/** Short guarantees shown above the steps. */
export const BEGINNER_TRUTHS = [
  { icon: "MousePointerClick", label: "GUI-first, terminal optional" },
  { icon: "Globe", label: "Works on every distro" },
  { icon: "Timer", label: "About 15 minutes total" },
] as const;
