"use client";

import { OfflineStatusBanner } from "@/components/OfflineStatusBanner";
import { PLGroupedTable } from "@/components/PLGroupedTable";
import { PLTableShimmer } from "@/components/PLTableShimmer";
import { ReportHeaderControls } from "@/components/ReportHeaderControls";
import { usePLReport } from "@/hooks/usePLReport";
import { useReportUIStore } from "@/stores/report-ui-store";

export default function HomePage() {
  const year = useReportUIStore((s) => s.year);
  const { data, isLoading, error, isFetching } = usePLReport(year);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header>
          <ReportHeaderControls
            title="Balance Sheet & Profit Loss"
            subtitle="Sheet: Profit & Loss — grouping from Guide (Remark column)"
          />
        </header>

        <OfflineStatusBanner />

        {isLoading && <PLTableShimmer />}

        {error && !data && (
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
