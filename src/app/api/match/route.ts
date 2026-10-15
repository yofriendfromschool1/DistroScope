import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { computeMatchResult } from "@/lib/matching";
import { QUIZ_QUESTIONS } from "@/data/questions";
import type { QuizAnswers } from "@/lib/types";

const AnswersSchema = z.record(z.string(), z.array(z.string()));

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
    return NextResponse.json(
      { error: "answers must be a map of question id to option ids" },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: "No valid answers provided" },
      { status: 400 }
    );
  }

  const { matches, relaxed } = computeMatchResult(answers);

  let totalQuizzes = 0;
  try {
    const session = await db.quizSession.create({
      data: {
        answers: JSON.stringify(answers),
        topMatch: matches[0]?.distro.name ?? "unknown",
        matchScore: matches[0]?.score ?? 0,
      },
    });
    void session;
    totalQuizzes = await db.quizSession.count();
  } catch {
    // database unavailable — matching still works
  }

  return NextResponse.json({ matches, relaxed, totalQuizzes });
}
