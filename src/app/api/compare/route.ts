import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { DISTROS } from "@/data/distros";

const bodySchema = z.object({
  ids: z
    .array(z.string().min(1).max(64))
    .min(2)
    .max(3),
});

/**
 * Records that a visitor actually viewed a side-by-side comparison.
 * Body: { ids: string[] } — 2 or 3 distro ids; unknown ids are rejected so
 * the aggregate stays clean. Deduped per client via localStorage in the
 * caller, so accidental double-posts stay rare.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const known = new Set(DISTROS.map((d) => d.id));
    const unique = Array.from(new Set(parsed.data.ids));
    if (unique.length < 2 || unique.some((id) => !known.has(id))) {
      return NextResponse.json(
        { error: "Unknown distro ids" },
        { status: 400 }
      );
    }
    const key = [...unique].sort().join(",");
    await db.compareEvent.create({ data: { ids: key } });
    return NextResponse.json({ ok: true, key });
  } catch {
    return NextResponse.json({ error: "Could not record" }, { status: 500 });
  }
}
