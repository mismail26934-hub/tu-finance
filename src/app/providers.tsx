"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState } from "react";
import { queryPersister } from "@/lib/query-persist";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: WEEK_MS,
            networkMode: "offlineFirst",
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: WEEK_MS,
        buster: "pl-report-v2",
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.queryKey[0] === "pl-report" &&
            query.state.status === "success",
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
