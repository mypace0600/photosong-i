"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const storageKey = useMemo(() => "photosong-i-install-dismissed", []);

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    setIos(isIosDevice());
    setDismissed(window.localStorage.getItem(storageKey) === "true");

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setStandalone(true);
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [storageKey]);

  if (standalone || dismissed || (!installEvent && !ios)) {
    return null;
  }

  async function handleInstall() {
    if (!installEvent) return;

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallEvent(null);
    }
  }

  function handleDismiss() {
    window.localStorage.setItem(storageKey, "true");
    setDismissed(true);
  }

  return (
    <div className="mt-4 rounded-[8px] bg-white p-4 shadow-sm ring-1 ring-[#ead8d0]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#241424]">
            포도송이를 홈 화면에 두기
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-[#604c5a]">
            {installEvent
              ? "앱처럼 설치하면 매일 바로 포도알을 채울 수 있습니다."
              : "iPhone에서는 공유 버튼을 누른 뒤 홈 화면에 추가를 선택하세요."}
          </p>
        </div>
        <button
          className="shrink-0 text-xs font-black text-[#86717f]"
          onClick={handleDismiss}
          type="button"
        >
          닫기
        </button>
      </div>
      {installEvent ? (
        <button
          className="mt-3 h-10 w-full rounded-[8px] bg-[#6f2c83] text-sm font-black text-white"
          onClick={() => void handleInstall()}
          type="button"
        >
          설치하기
        </button>
      ) : null}
    </div>
  );
}
