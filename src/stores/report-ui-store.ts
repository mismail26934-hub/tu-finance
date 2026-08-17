"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NegativeFormat } from "@/lib/format-number";

export type ExportMode = "filtered" | "all";

interface ReportUIState {
  year: string;
  negativeFormat: NegativeFormat;
  filterOnExpand: boolean;
  exportMode: ExportMode | null;
  setYear: (year: string) => void;
  setNegativeFormat: (format: NegativeFormat) => void;
  setFilterOnExpand: (enabled: boolean) => void;
  setExportMode: (mode: ExportMode | null) => void;
}

export const useReportUIStore = create<ReportUIState>()(
  persist(
    (set) => ({
      year: "2026",
      negativeFormat: "parentheses",
      filterOnExpand: true,
      exportMode: null,
      setYear: (year) => set({ year }),
      setNegativeFormat: (negativeFormat) => set({ negativeFormat }),
      setFilterOnExpand: (filterOnExpand) => set({ filterOnExpand }),
      setExportMode: (exportMode) => set({ exportMode }),
    }),
    {
      name: "pl-report-ui",
      partialize: (state) => ({
        year: state.year,
        negativeFormat: state.negativeFormat,
        filterOnExpand: state.filterOnExpand,
      }),
    }
  )
);
