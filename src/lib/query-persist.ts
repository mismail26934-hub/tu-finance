"use client";

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";

const CACHE_KEY = "pl-report-query-cache";

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

export const queryPersister = createAsyncStoragePersister({
  key: CACHE_KEY,
  throttleTime: 1000,
  storage: {
    getItem: async (key) => {
      if (!hasIndexedDb()) return null;
      const value = await get<string>(key);
      return value ?? null;
    },
    setItem: async (key, value) => {
      if (!hasIndexedDb()) return;
      await set(key, value);
    },
    removeItem: async (key) => {
      if (!hasIndexedDb()) return;
      await del(key);
    },
  },
});
