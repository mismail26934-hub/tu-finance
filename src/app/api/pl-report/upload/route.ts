import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { EXCEL_FILE_NAME } from "@/lib/excel-file";
import {
  guideFileExists,
  readGuideBuffer,
  saveExcelUpload,
} from "@/lib/excel-storage";
import { parsePLWorkbook } from "@/lib/parse-pl-excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Pilih file Excel (.xlsx) terlebih dahulu" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Hanya file .xlsx yang didukung" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 20 MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetNames = workbook.SheetNames;

    if (!sheetNames.includes("Profit & Loss")) {
      return NextResponse.json(
        { error: 'File harus berisi sheet "Profit & Loss"' },
        { status: 400 }
      );
    }

    if (!guideFileExists()) {
      return NextResponse.json(
        { error: "Guide.xlsx tidak ditemukan di folder data/Guide" },
        { status: 400 }
      );
    }

    const report = parsePLWorkbook(buffer, {
      guideBuffer: readGuideBuffer(),
    });
    if (!report.rows.length) {
      return NextResponse.json(
        { error: "File tidak berisi data P&L yang bisa dibaca" },
        { status: 400 }
      );
    }

    const { backupName } = saveExcelUpload(buffer);

    return NextResponse.json({
      ok: true,
      filename: EXCEL_FILE_NAME,
      originalName: file.name,
      backupName,
      rowCount: report.rows.length,
      periods: report.periods.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
