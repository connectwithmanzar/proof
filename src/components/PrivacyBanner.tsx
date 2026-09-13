"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "proof_privacy_dismissed";

export function PrivacyBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(DISMISS_KEY) !== "1");
  }, []);

  if (!visible) return null;

  return (
    <div
      className="mb-5 flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
      role="status"
    >
      <p className="flex-1 text-sm leading-snug text-zinc-300">
        Photos sync encrypted to your private Reckoning account. Only you can
        see them. Not a public feed.
      </p>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setVisible(false);
        }}
        className="min-h-[44px] min-w-[44px] shrink-0 rounded-xl text-sm text-zinc-400 hover:text-white"
        aria-label="Dismiss privacy notice"
      >
        OK
      </button>
    </div>
  );
}
