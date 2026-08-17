import { NextResponse } from "next/server";
import fs from "fs";
import {
  default2026PeriodFilter,
  parsePLWorkbook,
} from "@/lib/parse-pl-excel";
import {
  EXCEL_FILE_NAME,
  getExcelFilePath,
  getGuideFilePath,
} from "@/lib/excel-file";

function readGuideBuffer(): Buffer | undefined {
  const guidePath = getGuideFilePath();
  if (!fs.existsSync(guidePath)) return undefined;
  return fs.readFileSync(guidePath);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") ?? "2026";

    const filePath = getExcelFilePath();
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `Excel file not found at data/${EXCEL_FILE_NAME}` },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(filePath);
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
