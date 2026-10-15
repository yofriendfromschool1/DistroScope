import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DISTROS } from "@/data/distros";

/** quiz activity per UTC day for the trailing 14 days, oldest first */
function buildDailyBuckets(
  createdAts: Date[]
): { date: string; count: number }[] {
  const days: { date: string; count: number }[] = [];
  const indexByKey = new Map<string, number>();
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)
    );
    const key = d.toISOString().slice(0, 10);
    indexByKey.set(key, days.length);
    days.push({ date: key, count: 0 });
  }
  for (const ts of createdAts) {
    const idx = indexByKey.get(ts.toISOString().slice(0, 10));
    if (idx !== undefined) days[idx].count++;
  }
  return days;
}

export async function GET() {
  try {
    const totalQuizzes = await db.quizSession.count();
    const grouped = await db.quizSession.groupBy({
      by: ["topMatch"],
      _count: { topMatch: true },
      orderBy: { _count: { topMatch: "desc" } },
      take: 5,
    });

    // community verdict: most-loved distro by thumbs-up ratio (min 2 votes)
    let favorite: { name: string; up: number; down: number } | null = null;
    try {
      const feedback = await db.distroFeedback.groupBy({
        by: ["distroName", "helpful"],
        _count: { _all: true },
      });
      const tally = new Map<string, { up: number; down: number }>();
      for (const row of feedback) {
        const entry = tally.get(row.distroName) ?? { up: 0, down: 0 };
        if (row.helpful) entry.up += row._count._all;
        else entry.down += row._count._all;
        tally.set(row.distroName, entry);
      }
      let bestRatio = -1;
      for (const [name, { up, down }] of tally) {
        const votes = up + down;
        if (votes < 2) continue;
        const ratio = up / votes;
        if (ratio > bestRatio || (ratio === bestRatio && favorite && up > favorite.up)) {
          bestRatio = ratio;
          favorite = { name, up, down };
        }
      }
    } catch {
      favorite = null;
    }

    let daily: { date: string; count: number }[] = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - (13 - i));
      return { date: d.toISOString().slice(0, 10), count: 0 };
    });
    try {
      const sessions = await db.quizSession.findMany({
        select: { createdAt: true },
      });
      daily = buildDailyBuckets(sessions.map((s) => s.createdAt));
    } catch {
      // keep zeroed buckets
    }

    // family heat: aggregate every recorded top match into its distro family
    let families: { family: string; count: number }[] = [];
    try {
      const groupedAll = await db.quizSession.groupBy({
        by: ["topMatch"],
        _count: { topMatch: true },
      });
      const nameToFamily = new Map(DISTROS.map((d) => [d.name, d.family]));
      const tally = new Map<string, number>();
      for (const row of groupedAll) {
        const family = nameToFamily.get(row.topMatch);
        if (!family) continue; // unknown/renamed distro — ignore
        tally.set(family, (tally.get(family) ?? 0) + row._count.topMatch);
      }
      families = Array.from(tally.entries())
        .map(([family, count]) => ({ family, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    } catch {
      families = [];
    }

    // weekly trending: top matches recorded in the last 7 days
    let weekly: { name: string; count: number }[] = [];
    try {
      const since = new Date(Date.now() - 7 * 86_400_000);
      const groupedWeek = await db.quizSession.groupBy({
        by: ["topMatch"],
        _count: { topMatch: true },
        where: { createdAt: { gte: since } },
        orderBy: { _count: { topMatch: "desc" } },
        take: 5,
      });
      weekly = groupedWeek
        .filter((g) => DISTROS.some((d) => d.name === g.topMatch))
        .map((g) => ({ name: g.topMatch, count: g._count.topMatch }));
    } catch {
      weekly = [];
    }

    // duel arena: most-compared distro pairs/trios
    let compared: { ids: string[]; count: number }[] = [];
    try {
      const groupedCompares = await db.compareEvent.groupBy({
        by: ["ids"],
        _count: { ids: true },
        orderBy: { _count: { ids: "desc" } },
        take: 5,
      });
      const known = new Set(DISTROS.map((d) => d.id));
      compared = groupedCompares
        .map((g) => ({ ids: g.ids.split(","), count: g._count.ids }))
        .filter(
          (row) =>
            row.ids.length >= 2 && row.ids.length <= 3 &&
            row.ids.every((id) => known.has(id))
        );
    } catch {
      compared = [];
    }

    return NextResponse.json({
      totalQuizzes,
      topMatches: grouped.map((g) => ({
        name: g.topMatch,
        count: g._count.topMatch,
      })),
      favorite,
      daily,
      families,
      weekly,
      compared,
    });
  } catch {
    return NextResponse.json({
      totalQuizzes: 0,
      topMatches: [],
      favorite: null,
      daily: [],
      families: [],
      weekly: [],
      compared: [],
    });
  }
}
