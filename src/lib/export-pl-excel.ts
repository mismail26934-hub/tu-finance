"use client";

import * as XLSX from "xlsx";
import type { PLRow } from "@/types/pl-report";
import { excelNumberFormat, type NegativeFormat } from "@/lib/format-number";

const HEADER_FILL = { fgColor: { rgb: "FDBA74" } };
const TOTAL_FILL = { fgColor: { rgb: "A7F3D0" } };
const CATEGORY_FILL = { fgColor: { rgb: "BAE6FD" } };
const METRIC_FILL = { fgColor: { rgb: "FEF3C7" } };

const BOLD = { bold: true };
const HEADER_STYLE = {
  font: { ...BOLD },
  fill: HEADER_FILL,
  alignment: { horizontal: "center" as const },
};
const TOTAL_STYLE = { font: BOLD, fill: TOTAL_FILL };
const CATEGORY_STYLE = { font: BOLD, fill: CATEGORY_FILL };
const METRIC_STYLE = { font: { italic: true }, fill: METRIC_FILL };

function normalizeLabel(label: string): string {
  return label.replace(/\s+/g, " ").trim().toUpperCase();
}

function isPercentRow(label: string): boolean {
  return /\(%\)/.test(label) || /%$/.test(label.trim());
}

function cellStyle(row: PLRow) {
  if (row.rowType === "total") return TOTAL_STYLE;
  if (row.rowType === "category") return CATEGORY_STYLE;
  if (row.rowType === "metric") return METRIC_STYLE;
  return undefined;
}

function applyStyle(
  ws: XLSX.WorkSheet,
  address: string,
  style: Record<string, unknown> | undefined
) {
  if (!style) return;
  const cell = ws[address];
  if (!cell) return;
  cell.s = { ...(cell.s ?? {}), ...style };
}

function buildParentMap(rows: PLRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.parentLabel) {
      map.set(normalizeLabel(row.label), normalizeLabel(row.parentLabel));
    }
  }
  return map;
}

function getOutlineLevel(
  label: string,
  parentMap: Map<string, string>
): number {
  let level = 0;
  let parentKey = parentMap.get(normalizeLabel(label));
  const seen = new Set<string>();

  while (parentKey && !seen.has(parentKey)) {
    seen.add(parentKey);
    level += 1;
    parentKey = parentMap.get(parentKey);
  }

  return Math.min(level, 7);
}

function isHiddenByCollapsedAncestor(
  label: string,
  parentMap: Map<string, string>,
  collapsed: Set<string>
): boolean {
  let parentKey = parentMap.get(normalizeLabel(label));
  const seen = new Set<string>();

  while (parentKey && !seen.has(parentKey)) {
    if (collapsed.has(parentKey)) return true;
    seen.add(parentKey);
    parentKey = parentMap.get(parentKey);
  }

  return false;
}

export function exportPLToExcel(
  rows: PLRow[],
  periods: string[],
  options?: {
    filename?: string;
    sheetName?: string;
    collapsed?: Set<string>;
    negativeFormat?: NegativeFormat;
  }
) {
  const parentMap = buildParentMap(rows);
  const collapsed = options?.collapsed ?? new Set<string>();
  const numberFormat = excelNumberFormat(options?.negativeFormat ?? "parentheses");
  const header = ["Text for B/S P&L item", ...periods];
  const aoa: (string | number | null)[][] = [header];

  for (const row of rows) {
    aoa.push([
      row.label,
      ...periods.map((period) => {
        const value = row.values[period];
        if (value == null) return null;
        if (/^YTD(\s|$)/i.test(period.trim()) && Math.abs(value) < 0.005) {
          return null;
        }
        if (isPercentRow(row.label)) {
          return Math.abs(value) <= 1 ? value : value / 100;
        }
        return value;
      }),
    ]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  worksheet["!cols"] = [
    { wch: 55 },
    ...periods.map(() => ({ wch: 16 })),
  ];
  worksheet["!outline"] = { above: false };

  let rowInfo: XLSX.RowInfo[] = [{ hpt: 18 }];

  for (const row of rows) {
    const level = getOutlineLevel(row.label, parentMap);
    rowInfo.push({
      level,
      hidden: isHiddenByCollapsedAncestor(row.label, parentMap, collapsed),
      hpt: 16,
    });
  }

  worksheet["!rows"] = rowInfo;

  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1");

  for (let col = range.s.c; col <= range.e.c; col++) {
    const address = XLSX.utils.encode_cell({ r: 0, c: col });
    applyStyle(worksheet, address, HEADER_STYLE);
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const excelRow = rowIndex + 1;
    const row = rows[rowIndex];
    const style = cellStyle(row);
    const percent = isPercentRow(row.label);

    for (let col = range.s.c; col <= range.e.c; col++) {
      const address = XLSX.utils.encode_cell({ r: excelRow, c: col });
      const cell = worksheet[address];
      if (!cell) continue;

      if (col === 0) {
        applyStyle(worksheet, address, style);
        continue;
      }

      if (typeof cell.v === "number") {
        cell.z = percent ? "0.00%" : numberFormat;
      }
      applyStyle(worksheet, address, {
        ...(style ?? {}),
        alignment: { horizontal: "right" },
      });
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    options?.sheetName ?? "Profit & Loss"
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = options?.filename ?? `P&L Report ${stamp}.xlsx`;

  XLSX.writeFile(workbook, filename, {
    bookType: "xlsx",
  });
}
