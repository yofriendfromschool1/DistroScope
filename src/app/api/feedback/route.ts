import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { DISTROS } from "@/data/distros";

const FeedbackSchema = z.object({
  distroName: z.string().min(1).max(80),
  helpful: z.boolean(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "distroName (string) and helpful (boolean) are required" },
      { status: 400 }
    );
  }

  const known = DISTROS.some((d) => d.name === parsed.data.distroName);
  if (!known) {
    return NextResponse.json({ error: "Unknown distro" }, { status: 400 });
  }

  try {
    await db.distroFeedback.create({
      data: {
        distroName: parsed.data.distroName,
        helpful: parsed.data.helpful,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not save feedback" },
      { status: 500 }
    );
  }
}
