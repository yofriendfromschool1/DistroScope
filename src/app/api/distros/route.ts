import { NextResponse } from "next/server";
import { DISTROS, FAMILY_META, OS_SIMILARITY, USE_CASE_LABELS } from "@/data/distros";

export async function GET() {
  return NextResponse.json({
    distros: DISTROS,
    families: FAMILY_META,
    osSimilarity: OS_SIMILARITY,
    useCaseLabels: USE_CASE_LABELS,
  });
}
