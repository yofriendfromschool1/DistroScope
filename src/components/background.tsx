export function Background() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
    >
      {/* base */}
      <div className="absolute inset-0 bg-background" />

      {/* aurora blobs */}
      <div className="absolute -top-[22%] -left-[12%] h-[62vmax] w-[62vmax] rounded-full bg-violet-600/25 blur-[110px] animate-blob" />
      <div className="absolute top-[8%] -right-[16%] h-[56vmax] w-[56vmax] rounded-full bg-fuchsia-500/20 blur-[120px] animate-blob-alt" />
      <div
        className="absolute -bottom-[28%] left-[22%] h-[52vmax] w-[52vmax] rounded-full bg-rose-500/15 blur-[120px] animate-blob"
        style={{ animationDelay: "-9s" }}
      />
      <div
        className="absolute top-[42%] -left-[12%] h-[40vmax] w-[40vmax] rounded-full bg-amber-500/10 blur-[100px] animate-blob-alt"
        style={{ animationDelay: "-15s" }}
      />

      {/* slow conic sweep — a faint aurora curtain that rotates once a minute */}
      <div
        className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.05] animate-spin-slower"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgb(167 139 250 / 0.5) 40deg, transparent 90deg, rgb(232 121 249 / 0.4) 160deg, transparent 220deg, rgb(253 164 175 / 0.3) 300deg, transparent 360deg)",
        }}
      />

      {/* starfield — static tiled dots, barely-there twinkle via opacity drift */}
      <div className="starfield absolute inset-0 opacity-60" />

      {/* grid */}
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,black,transparent)]" />

      {/* grain */}
      <div className="noise absolute inset-0 opacity-[0.05] mix-blend-overlay" />

      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(0_0_0/0.42))]" />
    </div>
  );
}
