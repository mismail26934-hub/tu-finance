import * as XLSX from "xlsx";
import type { GuideEntry, PLReport, PLRow, RowType } from "@/types/pl-report";

const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30));
const SKIP_LABELS = new Set(["MRS", "SERVICE RECOVERY"]);

function normalizeLabel(label: string): string {
  return label.replace(/\s+/g, " ").trim();
}

function excelSerialToPeriod(value: unknown): string {
  if (value == null || value === "") return "";
  const text = String(value).trim();
  if (/^YTD\s/i.test(text)) return text;
  const num = Number(text);
  if (!Number.isFinite(num)) return text;

  const date = new Date(EXCEL_EPOCH.getTime() + num * 86400000);
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${month}-${year}`;
}

function parseNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return raw;
  const text = String(raw).replace(/,/g, "").trim();
  if (!text) return null;
  if (text.startsWith("(") && text.endsWith(")")) {
    const parsed = parseFloat(text.slice(1, -1));
    return Number.isNaN(parsed) ? null : -parsed;
  }
  const parsed = parseFloat(text);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseParentFromRemark(remark: string): string {
  const trimmed = remark.trim();
  if (/^sub dari\s+/i.test(trimmed)) {
    return normalizeLabel(trimmed.replace(/^sub dari\s+/i, ""));
  }
  return normalizeLabel(trimmed);
}

function accountCode(label: string): string | null {
  const match = normalizeLabel(label).match(/^(\d{7,})/);
  return match ? match[1] : null;
}

function findLabelInSet(
  target: string,
  labelIndex: Map<string, string>
): string | null {
  const key = normalizeLabel(target).toUpperCase();
  if (labelIndex.has(key)) return labelIndex.get(key) ?? null;

  const code = accountCode(target);
  if (code && labelIndex.has(code)) return labelIndex.get(code) ?? null;

  return null;
}

function buildLabelIndex(
  labels: string[]
): Map<string, string> {
  const labelIndex = new Map<string, string>();
  for (const label of labels) {
    labelIndex.set(normalizeLabel(label).toUpperCase(), label);
    const code = accountCode(label);
    if (code && !labelIndex.has(code)) {
      labelIndex.set(code, label);
    }
  }
  return labelIndex;
}

/** Map Guide Remark parent names to actual P&L row labels */
function resolveParentLabel(
  rawParent: string,
  labelIndex: Map<string, string>
): string | null {
  const normalized = normalizeLabel(rawParent);
  if (!normalized) return null;

  const direct = findLabelInSet(normalized, labelIndex);
  if (direct) return direct;

  if (/^REVENUE\s+/i.test(normalized)) {
    const suffix = normalized.replace(/^REVENUE\s+/i, "");
    const revenueParent = findLabelInSet(suffix, labelIndex);
    if (revenueParent) return revenueParent;
  }

  if (!/^TOTAL\s+/i.test(normalized)) {
    const totalParent = findLabelInSet(`TOTAL ${normalized}`, labelIndex);
    if (totalParent) return totalParent;
  }

  return null;
}

function classifyRow(label: string, hasChildren: boolean): RowType {
  const trimmed = normalizeLabel(label);
  if (!trimmed) return "header";
  const upper = trimmed.toUpperCase();

  if (upper === "PROFIT AND LOSS STATEMENT") return "header";
  if (/^TOTAL\s/.test(upper)) return "total";
  if (/^MARGIN/.test(upper) || /\(%\)/.test(upper)) return "metric";
  if (hasChildren) return "category";
  if (/^\d/.test(trimmed)) return "detail";

  const isAllCaps =
    trimmed === upper && /[A-Z]/.test(trimmed) && !/^\d/.test(trimmed);
  if (isAllCaps) return "category";

  return "detail";
}

function parseGuideWorkbook(workbook: XLSX.WorkBook): GuideEntry[] {
  const sheetName =
    workbook.SheetNames.find((name) => name.toLowerCase() === "guide") ??
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error('Sheet "Guide" not found');
  }

  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  const entries: GuideEntry[] = [];

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row) continue;

    const label = row[0] == null ? "" : normalizeLabel(String(row[0]));
    const remark = row[1] == null ? "" : String(row[1]).trim();
    if (!label) continue;
    if (label.toLowerCase() === "desc") continue;
    if (SKIP_LABELS.has(label.toUpperCase())) continue;

    entries.push({
      label,
      remark,
      parent: parseParentFromRemark(remark),
    });
  }

  return entries;
}

function loadGuideEntries(
  plWorkbook: XLSX.WorkBook,
  guideBuffer?: Buffer
): GuideEntry[] {
  if (guideBuffer) {
    const guideWorkbook = XLSX.read(guideBuffer, {
      type: "buffer",
      cellDates: false,
    });
    return parseGuideWorkbook(guideWorkbook);
  }

  const hasGuideSheet = plWorkbook.SheetNames.some(
    (name) => name.toLowerCase() === "guide"
  );
  if (hasGuideSheet) {
    return parseGuideWorkbook(plWorkbook);
  }

  throw new Error(
    'Guide tidak ditemukan. Simpan file Guide.xlsx di folder data/Guide'
  );
}

function parsePLValues(
  sheet: XLSX.WorkSheet,
  periodFilter?: (period: string) => boolean
): { periods: string[]; rows: { label: string; values: Record<string, number | null> }[] } {
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  const headerRowIndex = 1;
  const labelColIndex = 0;
  const headerRow = matrix[headerRowIndex] ?? [];

  const periodEntries: { key: string; colIndex: number }[] = [];
  for (let colIndex = 1; colIndex < headerRow.length; colIndex++) {
    const headerValue = headerRow[colIndex];
    if (headerValue == null || headerValue === "") continue;

    const period = excelSerialToPeriod(headerValue);
    if (!period || period === "Text for B/S P&L item") continue;
    if (periodFilter && !periodFilter(period)) continue;

    periodEntries.push({ key: period, colIndex });
  }

  const rows: { label: string; values: Record<string, number | null> }[] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex++) {
    const row = matrix[rowIndex];
    if (!row) continue;

    const labelRaw = row[labelColIndex];
    const label = labelRaw == null ? "" : normalizeLabel(String(labelRaw));
    if (!label || label.toUpperCase() === "PROFIT AND LOSS STATEMENT") continue;
    if (SKIP_LABELS.has(label.toUpperCase())) continue;

    const values: Record<string, number | null> = {};
    for (const period of periodEntries) {
      values[period.key] = parseNumber(row[period.colIndex]);
    }

    rows.push({ label, values });
  }

  return {
    periods: periodEntries.map((p) => p.key),
    rows,
  };
}

function buildFlatRowsFromGuide(
  plRows: { label: string; values: Record<string, number | null> }[],
  guideEntries: GuideEntry[]
): PLRow[] {
  const labelIndex = buildLabelIndex(plRows.map((row) => row.label));

  const guideByLabel = new Map<string, GuideEntry>();
  for (const entry of guideEntries) {
    guideByLabel.set(normalizeLabel(entry.label).toUpperCase(), entry);
    const code = accountCode(entry.label);
    if (code && !guideByLabel.has(code)) {
      guideByLabel.set(code, entry);
    }
  }

  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  for (const entry of guideEntries) {
    const childLabel = findLabelInSet(entry.label, labelIndex);
    if (!childLabel) continue;

    const resolvedParent = resolveParentLabel(entry.parent, labelIndex);
    if (!resolvedParent) continue;

    parentMap.set(normalizeLabel(childLabel).toUpperCase(), resolvedParent);

    const parentKey = normalizeLabel(resolvedParent).toUpperCase();
    if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
    childrenMap.get(parentKey)!.push(childLabel);
  }

  const plOrderIndex = new Map(
    plRows.map((r, i) => [normalizeLabel(r.label).toUpperCase(), i])
  );
  for (const [parentKey, children] of childrenMap.entries()) {
    children.sort(
      (a, b) =>
        (plOrderIndex.get(normalizeLabel(a).toUpperCase()) ?? 9999) -
        (plOrderIndex.get(normalizeLabel(b).toUpperCase()) ?? 9999)
    );
    childrenMap.set(parentKey, children);
  }

  return plRows.map((row, i) => {
    const key = normalizeLabel(row.label).toUpperCase();
    const code = accountCode(row.label);
    const guide = guideByLabel.get(key) ?? (code ? guideByLabel.get(code) : undefined);
    const childLabels = childrenMap.get(key) ?? [];
    const hasChildren = childLabels.length > 0;

    return {
      id: `row-${i + 1}`,
      label: row.label,
      remark: guide?.remark,
      parentLabel: parentMap.get(key),
      rowType: classifyRow(row.label, hasChildren),
      values: row.values,
      childLabels: hasChildren ? childLabels : undefined,
    };
  });
}

export function parsePLWorkbook(
  buffer: Buffer,
  options?: {
    sheetName?: string;
    periodFilter?: (period: string) => boolean;
    guideBuffer?: Buffer;
  }
): PLReport {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName =
    options?.sheetName ??
    workbook.SheetNames.find((name) => name === "Profit & Loss") ??
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  const guideEntries = loadGuideEntries(workbook, options?.guideBuffer);
  const { periods, rows: plRows } = parsePLValues(sheet, options?.periodFilter);
  const flatRows = buildFlatRowsFromGuide(plRows, guideEntries);

  return {
    sheetName,
    periods,
    rows: flatRows,
  };
}

const DEFAULT_2026_PERIODS = new Set([
  "Jan-26",
  "Feb-26",
  "Mar-26",
  "Apr-26",
  "May-26",
  "Jun-26",
  "Jul-26",
  "YTD 2026",
]);

export function default2026PeriodFilter(period: string): boolean {
  return DEFAULT_2026_PERIODS.has(period);
}

export { excelSerialToPeriod, normalizeLabel, resolveParentLabel };
