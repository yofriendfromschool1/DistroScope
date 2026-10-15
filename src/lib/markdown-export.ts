import { QUIZ_QUESTIONS } from "@/data/questions";
import { DISTROS } from "@/data/distros";
import type { DistroMatch, QuizAnswers } from "@/lib/types";

/**
 * Builds a GitHub-flavored Markdown document of a quiz run:
 * top match with reasons, runners-up, the full ranked list and
 * the answer sheet — ready to paste into a README, issue or gist.
 */

function answerLines(answers: QuizAnswers): string[] {
  return QUIZ_QUESTIONS.map((q) => {
    const picked = answers[q.id];
    if (!picked || picked.length === 0) return `- **${q.title}** — _skipped_`;
    const labels = picked
      .map((oid) => q.options.find((o) => o.id === oid)?.label ?? oid)
      .join(", ");
    return `- **${q.title}** — ${labels}`;
  });
}

export function buildResultsMarkdown(
  matches: DistroMatch[],
  answers: QuizAnswers,
  link: string
): string {
  const top = matches[0];
  const runnersUp = matches.slice(1, 4);
  const ranked = matches.slice(4, Math.min(matches.length, 15));
  const date = new Date().toISOString().slice(0, 10);

  const out: string[] = [
    `# My perfect Linux distro — ${top.distro.name} (${top.score}%)`,
    "",
    `_Ranked by [DistroScope](<${link}>) on ${date} — ${DISTROS.length} distros, 17 weighted traits, ${QUIZ_QUESTIONS.length} questions._`,
    "",
    "## 🏆 Perfect match",
    "",
    `**${top.distro.name}** — ${top.distro.tagline}`,
    "",
    ...top.reasons.map((r) => `- **${r.title}** — ${r.detail}`),
    "",
    `> Family: ${top.distro.family} · Based on: ${top.distro.basedOn ?? "Independent"} · Packages: ${top.distro.packageManager} · Release: ${top.distro.releaseModel} · Min RAM: ${top.distro.ramMin} MB`,
    "",
    "## 🥈 Runners-up",
    "",
    "| # | Distro | Match | Family |",
    "|---|--------|-------|--------|",
    ...runnersUp.map(
      (m, i) =>
        `| ${i + 2} | ${m.distro.name} | ${m.score}% | ${m.distro.family} |`
    ),
    "",
  ];

  if (ranked.length > 0) {
    out.push(
      "## 📋 Also worth a look",
      "",
      "| # | Distro | Match | Why it fits |",
      "|---|--------|-------|-------------|",
      ...ranked.map(
        (m, i) =>
          `| ${i + 5} | ${m.distro.name} | ${m.score}% | ${m.reasons[0]?.title ?? "Solid all-rounder"} |`
      ),
      ""
    );
  }

  out.push("## 📝 My answers", "", ...answerLines(answers), "");
  out.push(
    "---",
    "",
    `Take the quiz yourself: <${link}>`
  );

  return out.join("\n");
}

/** Copy text to the clipboard; falls back to a .md file download when
 *  the clipboard is blocked (some browsers / embedded webviews / iframes). */
export async function copyToClipboard(
  text: string,
  fallbackName?: string
): Promise<"copied" | "downloaded" | "failed"> {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (ok) return "copied";
    } catch {
      // fall through to download
    }
    if (fallbackName) {
      try {
        const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fallbackName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        return "downloaded";
      } catch {
        // ignore
      }
    }
    return "failed";
  }
}
