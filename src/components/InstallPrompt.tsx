"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setIsStandalone(standalone);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
      <div>
        <p className="font-medium">Pasang FinView di HP</p>
        {isIOS ? (
          <p className="mt-0.5 text-xs text-sky-800">
            Ketuk Share, lalu Add to Home Screen agar bisa dibuka tanpa
            jaringan.
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-sky-800">
            Setelah dipasang, buka sekali saat online supaya data tersimpan.
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {deferredPrompt && (
          <button
            type="button"
            onClick={install}
            className="rounded border border-sky-700 bg-sky-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-800"
          >
            Pasang
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs text-sky-700 hover:underline"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
