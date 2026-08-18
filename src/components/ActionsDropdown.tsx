"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  NEGATIVE_FORMAT_OPTIONS,
  type NegativeFormat,
} from "@/lib/format-number";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useReportUIStore } from "@/stores/report-ui-store";

function MenuSeparator() {
  return <div className="my-1 border-t border-gray-200" role="separator" />;
}

function MenuItem({
  children,
  onClick,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "font-medium text-emerald-700" : "text-gray-800"
      }`}
    >
      {active && (
        <span className="inline-block w-4 text-center text-emerald-600" aria-hidden>
          ✓
        </span>
      )}
      {!active && <span className="inline-block w-4" aria-hidden />}
      {children}
    </button>
  );
}

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </div>
  );
}

export function ActionsDropdown({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const negativeFormat = useReportUIStore((s) => s.negativeFormat);
  const setNegativeFormat = useReportUIStore((s) => s.setNegativeFormat);
  const setExportMode = useReportUIStore((s) => s.setExportMode);
  const { canInstall, isIOS, hasNativePrompt, install } = useInstallPrompt();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!showInstallHelp) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowInstallHelp(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showInstallHelp]);

  useEffect(() => {
    if (!pendingFile) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !uploading) setPendingFile(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingFile, uploading]);

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setUploadError(null);
    setUploadSuccess(null);
    setOpen(false);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setUploadError("Hanya file .xlsx yang didukung");
      return;
    }
    setPendingFile(file);
  };

  const confirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);

    try {
      const body = new FormData();
      body.append("file", pendingFile);
      const response = await fetch("/api/pl-report/upload", {
        method: "POST",
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload gagal");
      }

      await queryClient.invalidateQueries({ queryKey: ["pl-report"] });
      setUploadSuccess(
        `File diganti dengan ${pendingFile.name}. Data laporan sudah diperbarui.`
      );
      setPendingFile(null);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Upload gagal"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleExport = (mode: "filtered" | "all") => {
    setExportMode(mode);
    setOpen(false);
  };

  const handleMinusFormat = (format: NegativeFormat) => {
    setNegativeFormat(format);
    setOpen(false);
  };

  const handleInstall = async () => {
    setOpen(false);
    if (hasNativePrompt) {
      await install();
      return;
    }
    setShowInstallHelp(true);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={onPickFile}
      />

      <div className="relative w-full sm:w-auto" ref={menuRef}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 sm:w-auto sm:justify-start"
        >
          Actions
          <span className="text-xs text-gray-500" aria-hidden>
            ▼
          </span>
        </button>

        {open && (
          <div
            role="menu"
            className={
              embedded
                ? "absolute left-0 right-0 top-full z-40 mt-1 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                : "absolute left-1/2 top-full z-30 mt-1 w-max min-w-[220px] max-w-[min(280px,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-gray-200 bg-white py-1 shadow-lg sm:left-auto sm:right-0 sm:translate-x-0"
            }
          >
            <MenuItem onClick={() => inputRef.current?.click()}>
              Upload Excel
            </MenuItem>

            <MenuSeparator />

            <MenuItem onClick={() => handleExport("filtered")}>
              Export Excel
            </MenuItem>
            <MenuItem onClick={() => handleExport("all")}>
              Export All
            </MenuItem>

            <MenuSeparator />

            <MenuLabel>Format minus</MenuLabel>
            {NEGATIVE_FORMAT_OPTIONS.map((option) => (
              <MenuItem
                key={option.value}
                active={negativeFormat === option.value}
                onClick={() => handleMinusFormat(option.value)}
              >
                {option.label}
              </MenuItem>
            ))}

            {canInstall && (
              <>
                <MenuSeparator />
                <MenuItem onClick={handleInstall}>
                  Pasang FinView di HP
                </MenuItem>
              </>
            )}
          </div>
        )}
      </div>

      {uploadSuccess && (
        <p className="text-xs text-emerald-700">{uploadSuccess}</p>
      )}
      {uploadError && !pendingFile && (
        <p className="text-xs text-red-700">{uploadError}</p>
      )}

      {showInstallHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowInstallHelp(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-modal-title"
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="install-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              Pasang FinView di HP
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isIOS
                ? "Agar bisa dibuka tanpa jaringan, pasang FinView ke Home Screen."
                : "Setelah dipasang, buka sekali saat online supaya data tersimpan."}
            </p>
            <div className="mt-4 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              {isIOS ? (
                <>
                  <p>1. Ketuk tombol Share di Safari</p>
                  <p>2. Pilih &quot;Add to Home Screen&quot;</p>
                  <p>3. Ketuk &quot;Add&quot;</p>
                </>
              ) : (
                <>
                  <p>1. Buka menu browser (⋮)</p>
                  <p>2. Pilih &quot;Install app&quot; atau &quot;Add to Home screen&quot;</p>
                  <p>3. Buka FinView sekali saat online</p>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!uploading) setPendingFile(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="upload-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              Ganti file Excel?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              File P&amp;L di folder <code>data</code> akan diganti. File lama
              disimpan sebagai backup. Grouping tetap memakai{" "}
              <code>data/Guide/Guide.xlsx</code>.
            </p>
            <dl className="mt-4 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">File baru</dt>
                <dd className="text-right font-medium text-gray-900 break-all">
                  {pendingFile.name}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Ukuran</dt>
                <dd className="font-medium text-gray-900">
                  {(pendingFile.size / 1024 / 1024).toFixed(2)} MB
                </dd>
              </div>
            </dl>
            {uploadError && (
              <p className="mt-3 text-sm text-red-700">{uploadError}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => setPendingFile(null)}
                className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={confirmUpload}
                className="rounded border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {uploading ? "Mengunggah..." : "Replace & Refresh"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
