import { NextResponse } from "next/server";
import { getReportData, rowsToCsv } from "@/lib/supabase/reports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("group_id") || undefined;

  const rows = await getReportData(groupId);
  const csv = rowsToCsv(rows);

  const filename = groupId
    ? `reporte-grupo-${groupId.slice(0, 8)}.csv`
    : `reporte-completo-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
