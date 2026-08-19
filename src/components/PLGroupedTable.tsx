"use client";

import { useEffect, useMemo, useState } from "react";
import type { PLRow, RowType } from "@/types/pl-report";
import { exportPLToExcel } from "@/lib/export-pl-excel";
import { formatNumber } from "@/lib/format-number";
import {
  useReportUIStore,
  type ExportMode,
} from "@/stores/report-ui-store";
import type { NegativeFormat } from "@/lib/format-number";

function isYtdPeriod(period: string): boolean {
  return /^YTD(\s|$)/i.test(period.trim());
}

function isZeroOrBlankYtdValue(value: number | string | null | undefined): boolean {
  if (value == null || value === "") return true;
  const text = String(value).trim().replace(/,/g, "");
  if (!text || text === "-" || text === "—" || text === "–") return true;
  if (/^0+(\.0+)?$/.test(text)) return true;
  const numeric = typeof value === "number" ? value : Number(text);
  if (!Number.isFinite(numeric)) return true;
  return Math.abs(numeric) < 0.005;
}

function hasZeroOrBlankYtd(row: PLRow, periods: string[]): boolean {
  const ytdPeriods = periods.filter(isYtdPeriod);
  if (ytdPeriods.length === 0) return false;
  return ytdPeriods.every((period) => isZeroOrBlankYtdValue(row.values[period]));
}

function isUngroupedRow(row: PLRow): boolean {
  return row.rowType === "detail" || Boolean(row.parentLabel);
}

function formatValue(
  row: PLRow,
  period: string,
  negativeFormat: NegativeFormat
): string {
  const value = row.values[period];
  const isPercentRow = /\(%\)/.test(row.label) || /%$/.test(row.label.trim());

  if (isYtdPeriod(period) && isZeroOrBlankYtdValue(value)) return "";

  if (isPercentRow) {
    if (value == null) return "";
    const pct = Math.abs(value) <= 1 ? value * 100 : value;
    return `${pct.toFixed(2)}%`;
  }
  return formatNumber(value, negativeFormat);
}

function rowClassName(rowType: RowType): string {
  switch (rowType) {
    case "total":
      return "bg-emerald-100 font-bold text-gray-900";
    case "category":
      return "bg-sky-100 font-bold text-gray-900";
    case "metric":
      return "bg-amber-50 font-semibold italic text-gray-800";
    default:
      return "bg-white text-gray-700";
  }
}

function normalizeLabel(label: string): string {
  return label.replace(/\s+/g, " ").trim().toUpperCase();
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

function buildRowByLabel(rows: PLRow[]): Map<string, PLRow> {
  const map = new Map<string, PLRow>();
  for (const row of rows) {
    map.set(normalizeLabel(row.label), row);
  }
  return map;
}

function collectDescendantKeys(rootLabel: string, rowsByLabel: Map<string, PLRow>): Set<string> {
  const result = new Set<string>();

  function walk(label: string) {
    const key = normalizeLabel(label);
    if (result.has(key)) return;
    result.add(key);

    const row = rowsByLabel.get(key);
    if (!row?.childLabels?.length) return;

    for (const child of row.childLabels) {
      walk(child);
    }
  }

  walk(rootLabel);
  return result;
}

function isHiddenByCollapsedAncestor(
  row: PLRow,
  parentMap: Map<string, string>,
  expanded: Set<string>
): boolean {
  const rowKey = normalizeLabel(row.label);

  if (
    rowKey !== "MARGIN" &&
    /^MARGIN(\s|\(|$)/i.test(row.label.trim()) &&
    !expanded.has("MARGIN")
  ) {
    return true;
  }

  if (row.parentLabel && !expanded.has(normalizeLabel(row.parentLabel))) {
    return true;
  }

  let parentKey = parentMap.get(rowKey);
  const seen = new Set<string>();
  while (parentKey && !seen.has(parentKey)) {
    if (!expanded.has(parentKey)) return true;
    seen.add(parentKey);
    parentKey = parentMap.get(parentKey);
  }
  return false;
}

function labelPaddingLeft(row: PLRow): string {
  const key = normalizeLabel(row.label);
  if (row.rowType === "total") return "8px";
  if (key === "OPERATING PROFIT" || key === "PBT / PAT") return "8px";
  if (row.parentLabel || row.rowType === "detail") return "28px";
  return "8px";
}

function collectExpandableKeys(rows: PLRow[]): string[] {
  return rows
    .filter((row) => (row.childLabels?.length ?? 0) > 0)
    .map((row) => normalizeLabel(row.label));
}

const DEFAULT_EXPANDED_LABELS = new Set([
  "TOTAL REVENUE",
  "TOTAL COS",
  "TOTAL OHD",
]);

function getDefaultExpanded(rows: PLRow[]): Set<string> {
  const parentMap = buildParentMap(rows);
  const expanded = new Set<string>();

  for (const row of rows) {
    const key = normalizeLabel(row.label);
    if (!DEFAULT_EXPANDED_LABELS.has(key)) continue;
    if ((row.childLabels?.length ?? 0) === 0) continue;

    expanded.add(key);

    let parentKey =
      parentMap.get(key) ??
      (row.parentLabel ? normalizeLabel(row.parentLabel) : "");
    const seen = new Set<string>();
    while (parentKey && !seen.has(parentKey)) {
      expanded.add(parentKey);
      seen.add(parentKey);
      parentKey = parentMap.get(parentKey) ?? "";
    }
  }

  return expanded;
}

function GroupToggleButton({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group-toggle-btn"
      aria-label={collapsed ? "Expand group" : "Collapse group"}
      title={collapsed ? "Expand" : "Collapse"}
    >
      {collapsed ? "+" : "−"}
    </button>
  );
}

function ExportConfirmModal({
  open,
  mode,
  filename,
  rowCount,
  periodCount,
  filterLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  mode: ExportMode;
  filename: string;
  rowCount: number;
  periodCount: number;
  filterLabel: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const isAll = mode === "all";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="export-modal-title" className="text-lg font-semibold text-gray-900">
          Export ke Excel
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isAll
            ? "File akan berisi seluruh laporan Profit & Loss, termasuk grouping."
            : filterLabel
              ? `File akan berisi grup terfilter: ${filterLabel}.`
              : "File akan berisi laporan sesuai tampilan saat ini, termasuk grouping."}
        </p>
        <dl className="mt-4 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Jenis</dt>
            <dd className="font-medium text-gray-900">
              {isAll ? "Export All" : "Export Excel"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Jumlah baris</dt>
            <dd className="font-medium text-gray-900">{rowCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Periode</dt>
            <dd className="font-medium text-gray-900">{periodCount} kolom</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Nama file</dt>
            <dd className="text-right font-medium text-gray-900 break-all">
              {filename}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

interface PLGroupedTableProps {
  periods: string[];
  rows: PLRow[];
}

export function PLGroupedTable({ periods, rows }: PLGroupedTableProps) {
  const negativeFormat = useReportUIStore((s) => s.negativeFormat);
  const filterOnExpand = useReportUIStore((s) => s.filterOnExpand);
  const setFilterOnExpand = useReportUIStore((s) => s.setFilterOnExpand);
  const exportMode = useReportUIStore((s) => s.exportMode);
  const setExportMode = useReportUIStore((s) => s.setExportMode);
  const parentMap = useMemo(() => buildParentMap(rows), [rows]);
  const rowsByLabel = useMemo(() => buildRowByLabel(rows), [rows]);
  const expandableKeys = useMemo(() => collectExpandableKeys(rows), [rows]);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => getDefaultExpanded(rows)
  );

  const collapsed = useMemo(
    () => new Set(expandableKeys.filter((key) => !expanded.has(key))),
    [expandableKeys, expanded]
  );

  const filterScope = useMemo(() => {
    if (!activeFilter) return null;
    return collectDescendantKeys(activeFilter, rowsByLabel);
  }, [activeFilter, rowsByLabel]);

  const visibleRows = useMemo(() => {
    let nextRows = rows;

    if (filterOnExpand && filterScope) {
      nextRows = rows.filter((row) =>
        filterScope.has(normalizeLabel(row.label))
      );
    }

    return nextRows.filter(
      (row) =>
        !isHiddenByCollapsedAncestor(row, parentMap, expanded) &&
        !(isUngroupedRow(row) && hasZeroOrBlankYtd(row, periods))
    );
  }, [rows, parentMap, expanded, filterOnExpand, filterScope, periods]);

  const toggle = (label: string) => {
    const key = normalizeLabel(label);
    const wasCollapsed = !expanded.has(key);

    setExpanded((prev) => {
      const next = new Set(prev);
      if (wasCollapsed) next.add(key);
      else next.delete(key);
      return next;
    });

    if (!filterOnExpand) return;

    if (wasCollapsed) {
      setActiveFilter(key);
      return;
    }

    if (activeFilter === key) {
      setActiveFilter(null);
    }
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setExpanded(getDefaultExpanded(rows));
  };

  const expandAll = () => {
    setExpanded(new Set(expandableKeys));
    if (filterOnExpand) setActiveFilter(null);
  };

  const collapseAll = () => {
    setExpanded(new Set());
    setActiveFilter(null);
  };

  const activeFilterLabel = activeFilter
    ? rowsByLabel.get(activeFilter)?.label
    : null;

  const exportRows = useMemo(() => {
    let nextRows = rows;

    if (filterOnExpand && filterScope) {
      nextRows = rows.filter((row) =>
        filterScope.has(normalizeLabel(row.label))
      );
    }

    return nextRows.filter(
      (row) => !(isUngroupedRow(row) && hasZeroOrBlankYtd(row, periods))
    );
  }, [rows, filterOnExpand, filterScope, periods]);

  const filteredFilename = `P&L ${
    activeFilterLabel
      ? activeFilterLabel.replace(/[\\/:*?"<>|]/g, " ").trim()
      : "Report"
  }.xlsx`;
  const allFilename = "P&L Report All.xlsx";
  const pendingFilename =
    exportMode === "all" ? allFilename : filteredFilename;
  const pendingRows = exportMode === "all" ? rows : exportRows;

  const confirmExport = () => {
    if (!exportMode) return;
    exportPLToExcel(pendingRows, periods, {
      filename: pendingFilename,
      collapsed,
      negativeFormat,
    });
    setExportMode(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={expandAll}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Expand All
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Collapse All
        </button>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={filterOnExpand}
            onChange={(e) => {
              setFilterOnExpand(e.target.checked);
              if (!e.target.checked) setActiveFilter(null);
            }}
            className="h-4 w-4 rounded border-gray-300"
          />
          Filter saat ungroup
        </label>

        {filterOnExpand && activeFilterLabel && (
          <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-900">
            <span>
              Filter aktif: <strong>{activeFilterLabel}</strong>
            </span>
            <button
              type="button"
              onClick={clearFilter}
              className="rounded border border-blue-300 bg-white px-2 py-0.5 text-xs hover:bg-blue-100"
            >
              Hapus filter
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 md:hidden">
        Geser ke kanan untuk melihat kolom periode
      </p>

      <div className="pl-table-scroll rounded-lg border border-gray-300 shadow-sm max-h-[calc(100vh-220px)]">
        <table className="min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-orange-200 text-gray-900">
              <th className="sticky top-0 z-20 min-w-[200px] border-b border-r border-gray-300 bg-orange-200 px-3 py-2 text-left font-semibold md:sticky md:left-0 md:min-w-[360px]">
                Text for B/S P&L item
              </th>
              {periods.map((period) => (
                <th
                  key={period}
                  className="sticky top-0 z-10 min-w-[120px] border-b border-gray-300 bg-orange-200 px-3 py-2 text-right font-semibold whitespace-nowrap"
                >
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const hasChildren = (row.childLabels?.length ?? 0) > 0;
              const rowKey = normalizeLabel(row.label);
              const isCollapsed = hasChildren && !expanded.has(rowKey);
              const isFilteredRoot =
                filterOnExpand && activeFilter === rowKey;

              return (
                <tr
                  key={row.id}
                  className={`border-b border-gray-200 ${rowClassName(row.rowType)} ${
                    isFilteredRoot ? "ring-1 ring-inset ring-blue-300" : ""
                  }`}
                >
                  <td
                    className="min-w-[200px] border-r border-gray-200 bg-inherit px-2 py-1.5 align-middle md:sticky md:left-0 md:z-10 md:min-w-[360px]"
                    style={{ paddingLeft: labelPaddingLeft(row) }}
                  >
                    <div className="flex items-center gap-2">
                      {hasChildren ? (
                        <GroupToggleButton
                          collapsed={isCollapsed}
                          onClick={() => toggle(row.label)}
                        />
                      ) : (
                        <span className="group-toggle-spacer" aria-hidden="true" />
                      )}
                      <span className="leading-tight">{row.label}</span>
                    </div>
                  </td>
                  {periods.map((period) => (
                    <td
                      key={period}
                      className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap"
                    >
                      <span className="block w-full text-right">
                        {formatValue(row, period, negativeFormat)}
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ExportConfirmModal
        open={exportMode !== null}
        mode={exportMode ?? "filtered"}
        filename={pendingFilename}
        rowCount={pendingRows.length}
        periodCount={periods.length}
        filterLabel={
          exportMode === "filtered" ? activeFilterLabel ?? null : null
        }
        onCancel={() => setExportMode(null)}
        onConfirm={confirmExport}
      />
    </div>
  );
}
