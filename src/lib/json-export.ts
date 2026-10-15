import { QUIZ_QUESTIONS } from "@/data/questions";
import { DISTROS } from "@/data/distros";
import type {
  DistroMatch,
  QuizAnswers,
  ScoreKey,
} from "@/lib/types";

type DistroProfile = Partial<Record<ScoreKey, number>>;

/**
 * Builds a clean, consumer-friendly JSON document of a quiz run:
 * answer sheet, the user's expressed trait profile, and the ranked
 * matches with full trait vectors — for scripting, spreadsheets or
 * building on top of DistroScope data.
 */
export function buildResultsJson(
  matches: DistroMatch[],
  answers: QuizAnswers,
  link: string,
  profile: DistroProfile | null
): string {
  const doc = {
    generator: "DistroScope",
    version: 1,
    generatedAt: new Date().toISOString(),
    shareUrl: link,
    dataset: { distros: DISTROS.length, families: 8, traits: 17, questions: QUIZ_QUESTIONS.length },
    answers: QUIZ_QUESTIONS.map((q) => {
      const picked = answers[q.id] ?? [];
      return {
        question: q.title,
        questionId: q.id,
        skipped: picked.length === 0,
        selection: picked.map(
          (oid) => q.options.find((o) => o.id === oid)?.label ?? oid
        ),
        selectionIds: picked,
      };
    }),
    profile: {
      note: "0-100 trait vector; 50 = neutral, >50 = wants more. Only expressed traits included.",
      traits: profile ?? {},
    },
    matches: matches.map((m, i) => ({
      rank: i + 1,
      id: m.distro.id,
      name: m.distro.name,
      tagline: m.distro.tagline,
      matchPercent: m.score,
      reasons: m.reasons.map((r) => ({ title: r.title, detail: r.detail })),
      distro: {
        family: m.distro.family,
        basedOn: m.distro.basedOn ?? null,
        packageManager: m.distro.packageManager,
        releaseModel: m.distro.releaseModel,
        desktopEnvironments: m.distro.desktops,
        ramMinMb: m.distro.ramMin,
        difficulty1to5: m.distro.difficulty,
        popularity: m.distro.popularity,
        useCases: m.distro.useCases,
        website: m.distro.website,
        scores: m.distro.scores,
      },
    })),
  };
  return JSON.stringify(doc, null, 2);
}

/** Saves the JSON document as a .json download. */
export function downloadResultsJson(
  matches: DistroMatch[],
  answers: QuizAnswers,
  link: string,
  profile: DistroProfile | null,
  filename: string
): boolean {
  try {
    const blob = new Blob([buildResultsJson(matches, answers, link, profile)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}
