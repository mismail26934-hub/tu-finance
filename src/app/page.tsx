"use client";

import { ActionsDropdown } from "@/components/ActionsDropdown";
import { PLGroupedTable } from "@/components/PLGroupedTable";
import { PLTableShimmer } from "@/components/PLTableShimmer";
import { usePLReport } from "@/hooks/usePLReport";
import { useReportUIStore } from "@/stores/report-ui-store";

const YEAR_OPTIONS = [
  { value: "2026", label: "2026 (Jan–Jul + YTD)" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
  { value: "all", label: "All periods" },
];

export default function HomePage() {
  const year = useReportUIStore((s) => s.year);
  const setYear = useReportUIStore((s) => s.setYear);
  const { data, isLoading, error, isFetching } = usePLReport(year);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Balance Sheet &amp; Profit Loss
            </h1>
            <p className="text-sm text-gray-600">
              Sheet: Profit &amp; Loss — grouping from Guide (Remark column)
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <ActionsDropdown />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-gray-700">Period</span>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  {YEAR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </header>

        {isLoading && <PLTableShimmer />}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {(error as Error).message}
          </div>
        )}

        {data && (
          <div className="relative">
            {isFetching && !isLoading && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1 overflow-hidden rounded-t-lg">
                <div className="shimmer h-full w-full" />
              </div>
            )}
            <PLGroupedTable periods={data.periods} rows={data.rows} />
          </div>
        )}
      </div>
    </main>
  );
}
