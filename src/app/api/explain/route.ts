import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import ZAI from "z-ai-web-dev-sdk";
import { computeMatches } from "@/lib/matching";
import { QUIZ_QUESTIONS } from "@/data/questions";
import type { QuizAnswers } from "@/lib/types";

const AnswersSchema = z.record(z.string(), z.array(z.string()));

/** Turn raw answers into human-readable "question: answer labels" lines. */
function describeAnswers(answers: QuizAnswers): string[] {
  const lines: string[] = [];
  for (const q of QUIZ_QUESTIONS) {
    const ids = answers[q.id];
    if (!ids || ids.length === 0) continue;
    const labels = ids
      .map((id) => q.options.find((o) => o.id === id)?.label)
      .filter(Boolean);
    if (labels.length > 0) lines.push(`${q.title} ${labels.join(" + ")}`);
  }
  return lines;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload =
    body && typeof body === "object" && "answers" in body
      ? (body as { answers: unknown }).answers
      : undefined;
  const parsed = AnswersSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
  }

  // keep only known question/option ids
  const answers: QuizAnswers = {};
  for (const question of QUIZ_QUESTIONS) {
    const ids = parsed.data[question.id];
    if (!Array.isArray(ids)) continue;
    const valid = ids.filter((id) =>
      question.options.some((o) => o.id === id)
    );
    if (valid.length > 0) {
      answers[question.id] =
        question.type === "single" ? [valid[0]] : valid.slice(0, 3);
    }
  }
  if (Object.keys(answers).length === 0) {
    return NextResponse.json({ error: "No valid answers" }, { status: 400 });
  }

  const matches = computeMatches(answers).slice(0, 3);
  const top = matches[0];
  if (!top) {
    return NextResponse.json({ error: "No match computed" }, { status: 400 });
  }

  const profile = describeAnswers(answers)
    .map((l) => `- ${l}`)
    .join("\n");

  const topScores = top.distro.scores;
  const traitLine = `easeOfUse: ${topScores.easeOfUse}/100, performance: ${topScores.performance}/100, gamingSupport: ${topScores.gamingSupport}/100, privacyFocus: ${topScores.privacyFocus}/100, freshness: ${topScores.freshness}/100, stability: ${topScores.stability}/100`;

  const userPrompt = `A user completed the DistroScope quiz. Their answers:
${profile}

Our weighted engine ranked these distros:
${matches
  .map(
    (m, i) =>
      `${i + 1}. ${m.distro.name} (${m.score}% match) — ${m.distro.family} family, ${
        m.distro.releaseModel
      } release, difficulty ${m.distro.difficulty}/5, key traits: ${
        i === 0 ? traitLine : "see ranking above"
      }`
  )
  .join("\n")}

Write a short, warm, personal explanation of why ${top.distro.name} fits this person. Rules:
- 2 short paragraphs, max 130 words total. Plain text only, no markdown, no emojis, no lists.
- Paragraph 1: connect their specific answers to the distro's strengths.
- Paragraph 2: one honest caveat (a real trade-off of this distro for their situation) plus one practical tip for their first week.
- Address the user as "you". Never invent facts about the distro beyond the data given.`;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are DistroScope's AI advisor: a friendly, concise Linux expert who explains distro recommendations. You write grounded, specific, honest advice with zero fluff.",
        },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const explanation = completion.choices[0]?.message?.content?.trim();
    if (!explanation) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }

    return NextResponse.json({
      explanation,
      distroName: top.distro.name,
    });
  } catch (err) {
    console.error("[api/explain] LLM call failed:", err);
    return NextResponse.json(
      { error: "The AI oracle is unreachable right now" },
      { status: 502 }
    );
  }
}
