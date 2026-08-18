"use client";

import { useEffect, useRef, useState } from "react";
import { ActionsDropdown } from "@/components/ActionsDropdown";
import { useReportUIStore } from "@/stores/report-ui-store";

const YEAR_OPTIONS = [
  { value: "2026", label: "2026 (Jan–Jul + YTD)" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
  { value: "all", label: "All periods" },
];

function PeriodSelect({ id }: { id?: string }) {
  const year = useReportUIStore((s) => s.year);
  const setYear = useReportUIStore((s) => s.setYear);

  return (
    <label className="flex w-full flex-col gap-1 text-sm sm:w-auto">
      <span className="font-medium text-gray-700">Period</span>
      <select
        id={id}
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
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-5 w-5 text-gray-700"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

type ReportHeaderControlsProps = {
  title: React.ReactNode;
  subtitle: React.ReactNode;
};

export function ReportHeaderControls({
  title,
  subtitle,
}: ReportHeaderControlsProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 flex-1 text-2xl font-bold text-gray-900">
            {title}
          </h1>

          <div className="relative shrink-0 sm:hidden" ref={panelRef}>
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="mobile-report-menu"
              aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex items-center justify-center rounded border border-gray-300 bg-white p-2.5 shadow-sm hover:bg-gray-50"
            >
              <HamburgerIcon open={mobileOpen} />
            </button>

            {mobileOpen && (
              <div
                id="mobile-report-menu"
                className="absolute right-0 top-full z-30 mt-2 w-[min(320px,calc(100vw-2rem))] min-w-[240px] rounded-md border border-gray-200 bg-white p-3 shadow-lg"
              >
                <div className="space-y-3">
                  <PeriodSelect id="mobile-period-select" />
                  <ActionsDropdown embedded />
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="hidden text-sm text-gray-600 sm:block">{subtitle}</p>
      </div>

      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        <PeriodSelect />
        <ActionsDropdown />
      </div>
    </div>
  );
}
