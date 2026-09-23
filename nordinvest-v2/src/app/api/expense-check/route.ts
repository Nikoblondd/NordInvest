// Expense-check endpoint. Benchmarks the listing's stated monthly expenses
// (ejerudgift) against comparable active Boligsiden listings' expenses per m².
// Surfaces the #1 insight from the r/investering user research: broker-stated
// expense budgets are frequently under-stated. Cached at the edge for a day.

import { NextResponse } from "next/server";
import { checkExpense } from "@/lib/expense-check";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const zip = q.get("zip") ?? "";
  const type = q.get("type") ?? "condo";
  const area = Number(q.get("area"));
  const expense = Number(q.get("expense"));

  if (!zip || !area || expense == null || Number.isNaN(expense)) {
    return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  const data = await checkExpense(zip, type, area, expense);
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
    },
  });
}
