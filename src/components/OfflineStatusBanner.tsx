"use client";

import { usePLReport } from "@/hooks/usePLReport";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useReportUIStore } from "@/stores/report-ui-store";

function formatSyncedAt(timestamp: number) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function OfflineStatusBanner() {
  const year = useReportUIStore((s) => s.year);
  const online = useOnlineStatus();
  const { data, dataUpdatedAt, isError } = usePLReport(year);
  const syncedAt = formatSyncedAt(dataUpdatedAt);

  if (!online && data) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Mode offline — menampilkan data tersimpan
        {syncedAt ? ` (terakhir ${syncedAt})` : ""}.
      </div>
    );
  }

  if (!online && !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        Tidak ada koneksi dan belum ada data lokal untuk periode ini. Buka
        halaman saat online dulu agar data tersimpan.
      </div>
    );
  }

  if (online && isError && data) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Gagal memperbarui dari server — menampilkan data lokal
        {syncedAt ? ` (terakhir ${syncedAt})` : ""}.
      </div>
    );
  }

  if (online && data && syncedAt) {
    return (
      <p className="text-xs text-gray-500">Tersimpan di perangkat · {syncedAt}</p>
    );
  }

  return null;
}
