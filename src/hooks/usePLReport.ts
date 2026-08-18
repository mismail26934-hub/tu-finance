"use client";

import { useQuery } from "@tanstack/react-query";
import type { PLReport } from "@/types/pl-report";

async function fetchPLReport(year: string): Promise<PLReport> {
  const response = await fetch(`/api/pl-report?year=${year}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load report");
  }
  return response.json();
}

export function usePLReport(year: string = "2026") {
  return useQuery({
    queryKey: ["pl-report", year],
    queryFn: () => fetchPLReport(year),
    networkMode: "offlineFirst",
    staleTime: 5 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: (failureCount) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return false;
      return failureCount < 1;
    },
  });
}
