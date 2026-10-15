import type { DistroMatch, ScoreKey } from "@/lib/types";
import { TRAIT_LABELS } from "@/lib/similarity";
import { DISTROS } from "@/data/distros";
import { QUIZ_QUESTIONS } from "@/data/questions";

const DATASET_TAG = `${DISTROS.length} distros · 17 traits · ${QUIZ_QUESTIONS.length} questions`;

/**
 * Renders a 1200×675 PNG-ready share card onto a canvas element.
 * Pure canvas 2D — no dependencies, works in every modern browser.
 */

const W = 1200;
const H = 675;

type Ctx = CanvasRenderingContext2D;

function roundedRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function setAlpha(ctx: Ctx, text: string, spacingPx: number) {
  // letterSpacing is supported in Chromium; manual fallback elsewhere
  if ("letterSpacing" in ctx) {
    (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${spacingPx}px`;
    return () => {
      (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
    };
  }
  return () => {};
}

function glow(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

function truncate(ctx: Ctx, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

const FONT = `-apple-system, "Segoe UI", system-ui, Roboto, "Helvetica Neue", Arial, sans-serif`;
const MONO = `ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace`;

export function drawShareCard(
  canvas: HTMLCanvasElement,
  matches: DistroMatch[],
  url: string
): void {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const top = matches[0];
  if (!top) return;

  // ── backdrop ──
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0c0814");
  bg.addColorStop(0.55, "#120b1d");
  bg.addColorStop(1, "#1a0f24");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  glow(ctx, 190, 120, 420, "rgba(139,92,246,0.55)", 0.35);
  glow(ctx, 1080, 620, 460, "rgba(232,121,249,0.5)", 0.3);
  glow(ctx, 620, 340, 520, "rgba(251,191,36,0.35)", 0.08);

  // subtle grid
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  for (let x = 64; x < W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 64; y < H; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // glass card body
  roundedRect(ctx, 28, 28, W - 56, H - 56, 30);
  ctx.fillStyle = "rgba(255,255,255,0.028)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── header ──
  const headerGrad = ctx.createLinearGradient(64, 0, 340, 0);
  headerGrad.addColorStop(0, "#c4b5fd");
  headerGrad.addColorStop(1, "#f0abfc");
  ctx.fillStyle = headerGrad;
  ctx.font = `bold 34px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("DistroScope", 72, 100);

  const resetSpacing = setAlpha(ctx, "", 4);
  ctx.fillStyle = "rgba(244,240,255,0.55)";
  ctx.font = `600 13px ${MONO}`;
  ctx.fillText("PERFECT DISTRO FINDER", 74, 126);
  resetSpacing();

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(244,240,255,0.45)";
  ctx.font = `500 15px ${MONO}`;
  ctx.fillText(DATASET_TAG, W - 72, 100);
  ctx.textAlign = "left";

  // ── match ring ──
  const cx = 250;
  const cy = 388;
  const r = 118;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ringGrad.addColorStop(0, "#a78bfa");
  ringGrad.addColorStop(1, "#e879f9");
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 13;
  ctx.lineCap = "round";
  const start = -Math.PI / 2;
  const end = start + (Math.PI * 2 * top.score) / 100;
  ctx.shadowColor = "rgba(232,121,249,0.5)";
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = "center";
  ctx.fillStyle = "#faf7ff";
  ctx.font = `bold 64px ${FONT}`;
  ctx.fillText(`${top.score}%`, cx, cy + 14);
  const reset2 = setAlpha(ctx, "", 3);
  ctx.fillStyle = "rgba(244,240,255,0.5)";
  ctx.font = `600 14px ${MONO}`;
  ctx.fillText("MATCH", cx, cy + 44);
  reset2();
  ctx.textAlign = "left";

  // ── right column ──
  const rx = 460;

  ctx.fillStyle = "#f0abfc";
  const reset3 = setAlpha(ctx, "", 2.5);
  ctx.font = `700 14px ${FONT}`;
  ctx.fillText("YOUR PERFECT MATCH", rx, 258);
  reset3();

  ctx.fillStyle = "#faf7ff";
  ctx.font = `bold 54px ${FONT}`;
  ctx.fillText(truncate(ctx, top.distro.name, W - rx - 72), rx, 318);

  ctx.fillStyle = "rgba(244,240,255,0.6)";
  ctx.font = `400 20px ${FONT}`;
  ctx.fillText(truncate(ctx, top.distro.tagline, W - rx - 72), rx, 350);

  // meta pills
  const pills = [
    top.distro.family,
    top.distro.releaseModel === "rolling" ? "Rolling" : "Point release",
    `${top.distro.packageManager} packages`,
  ];
  let px = rx;
  const py = 380;
  ctx.font = `500 14px ${FONT}`;
  for (const pill of pills) {
    const w = ctx.measureText(pill).width + 26;
    roundedRect(ctx, px, py, w, 30, 15);
    ctx.fillStyle = "rgba(255,255,255,0.055)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(244,240,255,0.72)";
    ctx.fillText(pill, px + 13, py + 20);
    px += w + 10;
  }

  // ranked list
  const rows = matches.slice(0, 4);
  let ry = 462;
  ctx.font = `600 15px ${FONT}`;
  rows.forEach((m, i) => {
    // rank dot
    const dotColor = m.distro.color;
    ctx.beginPath();
    ctx.arc(rx + 8, ry - 5, 7, 0, Math.PI * 2);
    ctx.fillStyle = `${dotColor}cc`;
    ctx.shadowColor = `${dotColor}88`;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = i === 0 ? "#faf7ff" : "rgba(244,240,255,0.78)";
    ctx.font = `${i === 0 ? "600" : "500"} 17px ${FONT}`;
    ctx.fillText(truncate(ctx, m.distro.name, 300), rx + 30, ry);

    // score bar
    const barX = rx + 330;
    const barW = 220;
    roundedRect(ctx, barX, ry - 12, barW, 8, 4);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fill();
    const fg = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    fg.addColorStop(0, "rgba(139,92,246,0.85)");
    fg.addColorStop(1, "rgba(232,121,249,0.85)");
    roundedRect(ctx, barX, ry - 12, Math.max(10, (barW * m.score) / 100), 8, 4);
    ctx.fillStyle = fg;
    ctx.fill();

    ctx.textAlign = "right";
    ctx.fillStyle = "#f0abfc";
    ctx.font = `600 15px ${MONO}`;
    ctx.fillText(`${m.score}%`, W - 72, ry);
    ctx.textAlign = "left";

    ry += 46;
  });

  // ── footer ──
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(72, 566);
  ctx.lineTo(W - 72, 566);
  ctx.stroke();

  const findGrad = ctx.createLinearGradient(72, 0, 400, 0);
  findGrad.addColorStop(0, "#c4b5fd");
  findGrad.addColorStop(1, "#f0abfc");
  ctx.fillStyle = findGrad;
  ctx.font = `600 19px ${FONT}`;
  ctx.fillText("Find your perfect Linux →", 72, 606);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(244,240,255,0.45)";
  ctx.font = `500 14px ${MONO}`;
  ctx.fillText(url.replace(/^https?:\/\//, ""), W - 72, 606);
  ctx.textAlign = "left";
}

/** Draws the card and triggers a PNG download. Resolves false on failure. */
export async function downloadShareCard(
  matches: DistroMatch[],
  url: string,
  filename: string
): Promise<boolean> {
  const canvas = document.createElement("canvas");
  drawShareCard(canvas, matches, url);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      resolve(true);
    }, "image/png");
  });
}

// ── profile card variant ─────────────────────────────────────

const PROFILE_CARD_TRAITS: { key: ScoreKey; label: string }[] = [
  { key: "easeOfUse", label: "Ease" },
  { key: "customizability", label: "Control" },
  { key: "performance", label: "Speed" },
  { key: "outOfBox", label: "Ready" },
  { key: "stability", label: "Stable" },
  { key: "freshness", label: "Fresh" },
  { key: "privacyFocus", label: "Private" },
  { key: "gamingSupport", label: "Gaming" },
];

// compact one-line labels so nothing truncates on the card
const COMPACT_LABELS: Partial<Record<ScoreKey, string>> = {
  easeOfUse: "Ease of use",
  customizability: "Customization",
  performance: "Performance",
  outOfBox: "Out of box",
  stability: "Stability",
  freshness: "Freshness",
  privacyFocus: "Privacy",
  gamingSupport: "Gaming",
  devExperience: "Dev experience",
  communitySupport: "Community",
  documentation: "Documentation",
  macLike: "macOS-like",
  windowsLike: "Windows-like",
  traditionalUI: "Classic UI",
  serverUse: "Server use",
  armSupport: "ARM support",
  nvidiaSupport: "NVIDIA support",
};

function drawBackdrop(ctx: Ctx) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0c0814");
  bg.addColorStop(0.55, "#120b1d");
  bg.addColorStop(1, "#1a0f24");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  glow(ctx, 190, 120, 420, "rgba(139,92,246,0.55)", 0.35);
  glow(ctx, 1080, 620, 460, "rgba(232,121,249,0.5)", 0.3);
  glow(ctx, 620, 340, 520, "rgba(251,191,36,0.35)", 0.08);

  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  for (let x = 64; x < W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 64; y < H; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  roundedRect(ctx, 28, 28, W - 56, H - 56, 30);
  ctx.fillStyle = "rgba(255,255,255,0.028)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawHeaderForProfile(ctx: Ctx) {
  const headerGrad = ctx.createLinearGradient(64, 0, 380, 0);
  headerGrad.addColorStop(0, "#c4b5fd");
  headerGrad.addColorStop(1, "#f0abfc");
  ctx.fillStyle = headerGrad;
  ctx.font = `bold 34px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("DistroScope", 72, 100);

  const resetSpacing = setAlpha(ctx, "", 4);
  ctx.fillStyle = "rgba(244,240,255,0.55)";
  ctx.font = `600 13px ${MONO}`;
  ctx.fillText("YOUR DISTRO PROFILE", 74, 126);
  resetSpacing();

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(244,240,255,0.45)";
  ctx.font = `500 15px ${MONO}`;
  ctx.fillText(DATASET_TAG, W - 72, 100);
  ctx.textAlign = "left";
}

/**
 * Renders a 1200×675 PNG profile card: canvas-drawn trait radar overlaying
 * the user's answers (dashed) on their top match (solid), plus strongest
 * asks and the ranked top 3.
 */
export function drawProfileCard(
  canvas: HTMLCanvasElement,
  matches: DistroMatch[],
  profile: Partial<Record<ScoreKey, number>>,
  url: string
): void {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const top = matches[0];
  if (!top) return;

  drawBackdrop(ctx);
  drawHeaderForProfile(ctx);

  // ── radar (left) ──
  const cx = 268;
  const cy = 400;
  const R = 140;
  const N = PROFILE_CARD_TRAITS.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;

  // grid rings
  for (const frac of [0.25, 0.5, 0.75, 1]) {
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = angle(i % N);
      const x = cx + Math.cos(a) * R * frac;
      const y = cy + Math.sin(a) * R * frac;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // spokes
  for (let i = 0; i < N; i++) {
    const a = angle(i);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const polygon = (values: number[], stroke: string, fill: string, dashed: boolean) => {
    ctx.save();
    if (dashed) ctx.setLineDash([7, 6]);
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const idx = i % N;
      const a = angle(idx);
      const v = Math.max(4, Math.min(100, values[idx])) / 100;
      const x = cx + Math.cos(a) * R * v;
      const y = cy + Math.sin(a) * R * v;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.stroke();
    // vertex dots
    for (let i = 0; i < N; i++) {
      const a = angle(i);
      const v = Math.max(4, Math.min(100, values[i])) / 100;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v, 3, 0, Math.PI * 2);
      ctx.fillStyle = stroke;
      ctx.fill();
    }
    ctx.restore();
  };

  // You (dashed) underneath, match (solid) on top
  polygon(
    PROFILE_CARD_TRAITS.map((t) => profile[t.key] ?? 50),
    "#e879f9",
    "rgba(192,132,252,0.16)",
    true
  );
  polygon(
    PROFILE_CARD_TRAITS.map((t) => top.distro.scores[t.key]),
    top.distro.color,
    `${top.distro.color}33`,
    false
  );

  // axis labels
  ctx.font = `600 12px ${MONO}`;
  for (let i = 0; i < N; i++) {
    const a = angle(i);
    const lx = cx + Math.cos(a) * (R + 26);
    const ly = cy + Math.sin(a) * (R + 22);
    ctx.textAlign = Math.abs(Math.cos(a)) < 0.3 ? "center" : Math.cos(a) > 0 ? "left" : "right";
    ctx.fillStyle = "rgba(244,240,255,0.5)";
    ctx.fillText(PROFILE_CARD_TRAITS[i].label, lx, ly + 4);
  }
  ctx.textAlign = "left";

  // radar legend
  const legendY = 590;
  const legend: [string, string, boolean][] = [
    ["You — your answers", "#e879f9", true],
    [`${top.distro.name} — your match`, top.distro.color, false],
  ];
  let lx = 100;
  for (const [label, color, dashed] of legend) {
    ctx.save();
    if (dashed) ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(lx, legendY);
    ctx.lineTo(lx + 28, legendY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(244,240,255,0.7)";
    ctx.font = `500 14px ${FONT}`;
    ctx.fillText(label, lx + 38, legendY + 5);
    lx += 38 + ctx.measureText(label).width + 36;
  }

  // ── right column ──
  const rx = 540;

  ctx.fillStyle = "#f0abfc";
  const resetEyebrow = setAlpha(ctx, "", 2.5);
  ctx.font = `700 14px ${FONT}`;
  ctx.fillText("YOUR STRONGEST ASKS", rx, 230);
  resetEyebrow();

  const asks = (Object.entries(profile) as [ScoreKey, number][])
    .filter(([, v]) => Math.abs(v - 50) >= 12)
    .sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50))
    .slice(0, 4);

  if (asks.length === 0) {
    ctx.fillStyle = "rgba(244,240,255,0.55)";
    ctx.font = `400 16px ${FONT}`;
    ctx.fillText("A balanced profile — no extreme asks.", rx, 268);
  } else {
    let ay = 264;
    for (const [key, value] of asks) {
      ctx.fillStyle = "rgba(244,240,255,0.85)";
      ctx.font = `600 15px ${FONT}`;
      const label = COMPACT_LABELS[key] ?? TRAIT_LABELS[key] ?? key;
      ctx.fillText(label, rx, ay);

      // directional bar from center
      const barX = rx + 170;
      const barW = 250;
      const center = barX + barW / 2;
      roundedRect(ctx, barX, ay - 10, barW, 8, 4);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.arc(center, ay - 6, 2.5, 0, Math.PI * 2);
      ctx.fill();

      const mag = Math.abs(value - 50) * 2; // 0-100
      const w = (barW / 2) * (mag / 100);
      const grad = ctx.createLinearGradient(
        value >= 50 ? center : center - w,
        0,
        value >= 50 ? center + w : center,
        0
      );
      grad.addColorStop(0, "rgba(139,92,246,0.9)");
      grad.addColorStop(1, "rgba(232,121,249,0.9)");
      roundedRect(
        ctx,
        value >= 50 ? center : center - w,
        ay - 10,
        Math.max(6, w),
        8,
        4
      );
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.textAlign = "right";
      ctx.fillStyle = "#f0abfc";
      ctx.font = `600 14px ${MONO}`;
      ctx.fillText(
        value >= 50 ? `+${Math.round(mag / 2)}` : `${Math.round(mag / 2)}`,
        W - 72,
        ay
      );
      ctx.textAlign = "left";
      ay += 44;
    }
  }

  // ranked top 3
  const rows = matches.slice(0, 3);
  let ry = 470;
  ctx.fillStyle = "rgba(244,240,255,0.55)";
  const resetRank = setAlpha(ctx, "", 2.5);
  ctx.font = `600 13px ${MONO}`;
  ctx.fillText("TOP MATCHES", rx, ry - 16);
  resetRank();
  ctx.font = `600 15px ${FONT}`;
  rows.forEach((m, i) => {
    ctx.beginPath();
    ctx.arc(rx + 8, ry - 5, 7, 0, Math.PI * 2);
    ctx.fillStyle = `${m.distro.color}cc`;
    ctx.shadowColor = `${m.distro.color}88`;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = i === 0 ? "#faf7ff" : "rgba(244,240,255,0.78)";
    ctx.font = `${i === 0 ? "600" : "500"} 17px ${FONT}`;
    ctx.fillText(truncate(ctx, m.distro.name, 240), rx + 30, ry);

    const barX = rx + 280;
    const barW = 240;
    roundedRect(ctx, barX, ry - 12, barW, 8, 4);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fill();
    const fg = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    fg.addColorStop(0, "rgba(139,92,246,0.85)");
    fg.addColorStop(1, "rgba(232,121,249,0.85)");
    roundedRect(ctx, barX, ry - 12, Math.max(10, (barW * m.score) / 100), 8, 4);
    ctx.fillStyle = fg;
    ctx.fill();

    ctx.textAlign = "right";
    ctx.fillStyle = "#f0abfc";
    ctx.font = `600 15px ${MONO}`;
    ctx.fillText(`${m.score}%`, W - 72, ry);
    ctx.textAlign = "left";

    ry += 42;
  });

  // ── footer ──
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(72, 606);
  ctx.lineTo(W - 72, 606);
  ctx.stroke();

  const findGrad = ctx.createLinearGradient(72, 0, 400, 0);
  findGrad.addColorStop(0, "#c4b5fd");
  findGrad.addColorStop(1, "#f0abfc");
  ctx.fillStyle = findGrad;
  ctx.font = `600 19px ${FONT}`;
  ctx.fillText("Find your perfect Linux →", 72, 640);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(244,240,255,0.45)";
  ctx.font = `500 14px ${MONO}`;
  ctx.fillText(url.replace(/^https?:\/\//, ""), W - 72, 640);
  ctx.textAlign = "left";
}

/** Draws the profile card and triggers a PNG download. Resolves false on failure. */
export async function downloadProfileCard(
  matches: DistroMatch[],
  profile: Partial<Record<ScoreKey, number>>,
  url: string,
  filename: string
): Promise<boolean> {
  const canvas = document.createElement("canvas");
  drawProfileCard(canvas, matches, profile, url);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      resolve(true);
    }, "image/png");
  });
}
