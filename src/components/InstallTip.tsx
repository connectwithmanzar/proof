"use client";

import { useEffect, useState } from "react";
import { isIOS, isStandalone } from "@/lib/display-mode";

const DISMISS_KEY = "proof_install_tip_dismissed";

export function InstallTip() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    setIos(isIOS());
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="mb-5 flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
      role="status"
    >
      <p className="flex-1 text-sm leading-snug text-zinc-300">
        {ios
          ? "Add Reckoning to your Home Screen — tap Share, then Add to Home Screen."
          : "Install Reckoning — open the browser menu and tap Install app / Add to Home Screen."}
      </p>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setVisible(false);
        }}
        className="min-h-[44px] min-w-[44px] shrink-0 rounded-xl text-sm text-zinc-400 hover:text-white"
        aria-label="Dismiss install tip"
      >
        OK
      </button>
    </div>
  );
}
