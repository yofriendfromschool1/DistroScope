import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { computeMatches } from "@/lib/matching";
import { decodeQuizAnswers } from "@/lib/quiz-url";
import { DISTROS } from "@/data/distros";
import { QUIZ_QUESTIONS } from "@/data/questions";
import type { Distro, DistroMatch } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// GET /api/og            → branded card
// GET /api/og?q=<code>   → personalized card with top-3 matches
//
// Renders a 1200×630 social preview with satori (inline styles,
// flexbox only). Uses Carlito from the system font directory.
// ─────────────────────────────────────────────────────────────

const W = 1200;
const H = 630;

// brand palette (matches globals.css dark theme, no indigo/blue)
const C = {
  bg: "#0d0b12",
  violet: "#c4b5fd",
  fuchsia: "#e879f9",
  rose: "#fda4af",
  text: "#f4f2f9",
  muted: "rgba(244,242,249,0.62)",
  faint: "rgba(244,242,249,0.38)",
  line: "rgba(255,255,255,0.14)",
};

async function loadFonts() {
  const [bold, regular, monoBold] = await Promise.all([
    readFile("/usr/share/fonts/truetype/english/Carlito-Bold.ttf"),
    readFile("/usr/share/fonts/truetype/english/Carlito-Regular.ttf"),
    readFile("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"),
  ]);
  return [
    { name: "Carlito", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Carlito", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "DejaVu Mono", data: monoBold, weight: 700 as const, style: "normal" as const },
  ];
}

function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: "linear-gradient(135deg, #8b5cf6, #d946ef 60%, #f59e0b)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 34px rgba(192,132,252,0.45)",
        }}
      >
        <span style={{ fontSize: 28, color: "#ffffff", fontWeight: 700 }}>◎</span>
      </div>
      <span style={{ fontSize: 34, fontWeight: 700, color: C.text, letterSpacing: -0.5 }}>
        Distro
        <span style={{ color: C.fuchsia }}>Scope</span>
      </span>
    </div>
  );
}

function Ring({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  // satori can't render conic-gradient — draw the arc as an inline SVG
  // (track circle + stroke-dasharray arc rotated to 12 o'clock)
  const r = 74;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="168" height="168" viewBox="0 0 168 168">` +
    `<circle cx="84" cy="84" r="${r}" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="14"/>` +
    `<circle cx="84" cy="84" r="${r}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" ` +
    `stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 84 84)"/></svg>`;
  const dataUri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  return (
    <div
      style={{
        width: 168,
        height: 168,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `url("${dataUri}")`,
        backgroundSize: "168px 168px",
        boxShadow: `0 0 44px ${color}33`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 44, fontWeight: 700, color: C.text, fontFamily: "DejaVu Mono" }}>
          {value}
          <span style={{ fontSize: 24, color: C.muted }}>%</span>
        </span>
        <span style={{ fontSize: 14, color: C.faint, letterSpacing: 3, marginTop: 2 }}>MATCH</span>
      </div>
    </div>
  );
}

function RankedRow({ m, i }: { m: DistroMatch; i: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14 }}>
      <span style={{ fontFamily: "DejaVu Mono", fontSize: 16, color: C.faint, width: 24 }}>
        {i + 1}
      </span>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${m.distro.color}dd, ${m.distro.color}55)`,
          border: `1px solid ${m.distro.color}88`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontFamily: "DejaVu Mono", fontSize: 13, color: "#ffffff", fontWeight: 700 }}>
          {m.distro.initials}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{m.distro.name}</span>
        <span style={{ fontSize: 15, color: C.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 420 }}>
          {m.distro.tagline}
        </span>
      </div>
      <span style={{ fontFamily: "DejaVu Mono", fontSize: 20, color: C.fuchsia, fontWeight: 700 }}>
        {m.score}%
      </span>
    </div>
  );
}

function GenericCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        padding: 64,
        position: "relative",
      }}
    >
      {/* glows */}
      <div
        style={{
          position: "absolute",
          top: -180,
          left: -140,
          width: 560,
          height: 560,
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(139,92,246,0.32), rgba(139,92,246,0))",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -220,
          right: -120,
          width: 520,
          height: 520,
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(217,70,239,0.22), rgba(217,70,239,0))",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark />
        <span style={{ fontFamily: "DejaVu Mono", fontSize: 15, color: C.faint, letterSpacing: 2 }}>
          42 DISTROS · 8 FAMILIES
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 84, maxWidth: 900 }}>
        <span style={{ fontSize: 20, color: C.fuchsia, letterSpacing: 4, fontWeight: 700 }}>
          THE GLASS MAP OF THE LINUX UNIVERSE
        </span>
        <span style={{ fontSize: 68, fontWeight: 700, color: C.text, marginTop: 14, lineHeight: 1.08, letterSpacing: -1 }}>
          Find the Linux that
        </span>
        <span style={{ fontSize: 68, fontWeight: 700, marginTop: 4, lineHeight: 1.08, letterSpacing: -1 }}>
          <span style={{ color: C.violet }}>feels like </span>
          <span style={{ color: C.fuchsia }}>home</span>
        </span>
        <span style={{ fontSize: 24, color: C.muted, marginTop: 26, lineHeight: 1.4 }}>
          One interactive map, one smart quiz, zero telemetry.
        </span>
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: "auto" }}>
        {[`${DISTROS.length} distros`, `${QUIZ_QUESTIONS.length} questions`, "17 traits", "0 telemetry"].map((chip) => (
          <div
            key={chip}
            style={{
              display: "flex",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              padding: "12px 26px",
            }}
          >
            <span style={{ fontSize: 18, color: C.muted, fontWeight: 400 }}>{chip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ matches }: { matches: DistroMatch[] }) {
  const top = matches[0];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        padding: 56,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -160,
          right: -120,
          width: 520,
          height: 520,
          borderRadius: 999,
          background: `radial-gradient(circle, ${top.distro.color}33, rgba(0,0,0,0))`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -240,
          left: -160,
          width: 560,
          height: 560,
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(139,92,246,0.24), rgba(139,92,246,0))",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark />
        <span style={{ fontFamily: "DejaVu Mono", fontSize: 15, color: C.faint, letterSpacing: 2 }}>
          YOUR RESULTS
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 48, marginTop: 52 }}>
        <Ring value={top.score} color={top.distro.color} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 16, color: C.fuchsia, letterSpacing: 4, fontWeight: 700 }}>
            YOUR PERFECT MATCH
          </span>
          <span style={{ fontSize: 56, fontWeight: 700, color: C.text, marginTop: 8, lineHeight: 1.05 }}>
            {top.distro.name}
          </span>
          <span style={{ fontSize: 20, color: C.muted, marginTop: 12, lineHeight: 1.35 }}>
            {top.distro.tagline}
          </span>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            {[top.distro.family, top.distro.releaseModel === "rolling" ? "Rolling" : "Point", `${top.distro.ramMin} MB+`].map(
              (chip) => (
                <div
                  key={chip}
                  style={{
                    display: "flex",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.05)",
                    padding: "8px 18px",
                  }}
                >
                  <span style={{ fontSize: 15, color: C.muted }}>{chip}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "auto",
          borderTop: `1px solid ${C.line}`,
          paddingTop: 8,
        }}
      >
        {matches.slice(1, 3).map((m, i) => (
          <RankedRow key={m.distro.id} m={m} i={i + 1} />
        ))}
      </div>
    </div>
  );
}

function CompareCard({ distros }: { distros: Distro[] }) {
  const cols = distros.slice(0, 3);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        padding: 56,
        position: "relative",
      }}
    >
      {cols.map((d, i) => (
        <div
          key={d.id}
          style={{
            position: "absolute",
            top: -180,
            ...(i === 0
              ? { left: -140 }
              : i === cols.length - 1
                ? { right: -140 }
                : { left: 360 }),
            width: 480,
            height: 480,
            borderRadius: 999,
            background: `radial-gradient(circle, ${d.color}26, rgba(0,0,0,0))`,
          }}
        />
      ))}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark />
        <span style={{ fontFamily: "DejaVu Mono", fontSize: 15, color: C.faint, letterSpacing: 2 }}>
          SIDE BY SIDE
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
        <span style={{ fontSize: 19, color: C.fuchsia, letterSpacing: 4, fontWeight: 700 }}>
          THE HEAD-TO-HEAD
        </span>
        <span style={{ fontSize: 52, fontWeight: 700, color: C.text, marginTop: 10, lineHeight: 1.08, letterSpacing: -0.5 }}>
          {cols.map((d, i) => (
            <span key={d.id}>
              {i > 0 && (
                <span style={{ fontFamily: "DejaVu Mono", fontSize: 30, color: C.fuchsia, margin: "0 16px" }}>
                  vs
                </span>
              )}
              <span style={{ color: i === 0 ? C.text : i === 1 ? C.violet : C.rose }}>{d.name}</span>
            </span>
          ))}
        </span>
      </div>

      <div style={{ display: "flex", gap: 20, marginTop: "auto" }}>
        {cols.map((d, i) => (
          <div
            key={d.id}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              borderRadius: 24,
              border: `1px solid ${d.color}55`,
              background: `linear-gradient(180deg, ${d.color}14, rgba(255,255,255,0.02))`,
              padding: 24,
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 15,
                  background: `linear-gradient(135deg, ${d.color}dd, ${d.color}55)`,
                  border: `1px solid ${d.color}88`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontFamily: "DejaVu Mono", fontSize: 17, color: "#ffffff", fontWeight: 700 }}>
                  {d.initials}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: C.text }}>{d.name}</span>
                <span style={{ fontSize: 14, color: C.muted, marginTop: 2 }}>{d.family} family</span>
              </div>
            </div>
            <span
              style={{
                fontSize: 15,
                color: C.muted,
                marginTop: 16,
                lineHeight: 1.4,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 300,
              }}
            >
              {d.tagline}
            </span>
            <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 18 }}>
              {[d.releaseModel === "rolling" ? "Rolling" : "Point", `${d.ramMin} MB`, d.packageManager].map((chip) => (
                <div
                  key={chip}
                  style={{
                    display: "flex",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.05)",
                    padding: "6px 14px",
                  }}
                >
                  <span style={{ fontSize: 13, color: C.muted }}>{chip}</span>
                </div>
              ))}
            </div>
            <span style={{ fontFamily: "DejaVu Mono", fontSize: 11, color: C.faint, marginTop: 14, letterSpacing: 2 }}>
              #{i + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("q");
  const compareRaw = searchParams.get("c");

  // compare card — /?c=id1,id2[,id3] shared comparisons
  if (compareRaw) {
    const valid = new Set(DISTROS.map((d) => d.id));
    const ids = compareRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => valid.has(s))
      .slice(0, 3);
    const distros = ids
      .map((id) => DISTROS.find((d) => d.id === id))
      .filter((d): d is Distro => !!d);
    if (distros.length >= 2) {
      const fonts = await loadFonts();
      return new ImageResponse(<CompareCard distros={distros} />, {
        width: W,
        height: H,
        fonts,
      });
    }
  }

  let matches: DistroMatch[] | null = null;
  if (code) {
    const answers = decodeQuizAnswers(code);
    if (answers) {
      try {
        matches = computeMatches(answers).slice(0, 3);
      } catch {
        matches = null;
      }
    }
  }

  const fonts = await loadFonts();
  const hasMatches = !!matches && matches.length >= 3;

  return new ImageResponse(
    hasMatches ? <MatchCard matches={matches!} /> : <GenericCard />,
    {
      width: W,
      height: H,
      fonts,
    }
  );
}
