import { NextResponse } from "next/server";
import { EXCEL_FILE_NAME } from "@/lib/excel-file";
import { readExcelBuffer, readGuideBuffer } from "@/lib/excel-storage";
import {
  default2026PeriodFilter,
  parsePLWorkbook,
} from "@/lib/parse-pl-excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") ?? "2026";

    const buffer = readExcelBuffer();
    if (!buffer) {
      return NextResponse.json(
        { error: `Excel file not found at data/${EXCEL_FILE_NAME}` },
        { status: 404 }
      );
    }

    const periodFilter =
      year === "all"
        ? undefined
        : (period: string) => {
            if (year === "2026") return default2026PeriodFilter(period);
            return period.includes(year) || period === `YTD ${year}`;
          };

    const report = parsePLWorkbook(buffer, {
      periodFilter,
      guideBuffer: readGuideBuffer(),
    });

    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
