"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SIDE_ITEMS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/timeline", label: "Timeline", icon: TimelineIcon },
  { href: "/compare", label: "Compare", icon: CompareIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const captureActive = pathname.startsWith("/capture");

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-zinc-900 bg-black/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-4 items-end px-1 pt-3">
        <SideTab item={SIDE_ITEMS[0]} pathname={pathname} />
        <li>
          <Link
            href="/capture"
            className={`flex min-h-14 flex-col items-center justify-end gap-1 pb-1 text-[11px] font-medium ${
              captureActive ? "text-white" : "text-zinc-500"
            }`}
          >
            <span className="flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full bg-white text-black shadow-[0_6px_20px_rgba(0,0,0,0.45)]">
              <CaptureIcon />
            </span>
            <span className="-mt-2">Capture</span>
          </Link>
        </li>
        <SideTab item={SIDE_ITEMS[1]} pathname={pathname} />
        <SideTab item={SIDE_ITEMS[2]} pathname={pathname} />
      </ul>
    </nav>
  );
}

function SideTab({
  item,
  pathname,
}: {
  item: (typeof SIDE_ITEMS)[number];
  pathname: string;
}) {
  const active =
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
          active ? "text-white" : "text-zinc-500"
        }`}
      >
        <Icon />
        {item.label}
      </Link>
    </li>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaptureIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="6"
        width="18"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 6 9.2 4.2A1 1 0 0 1 10 4h4a1 1 0 0 1 .8.4L16 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 6h14M5 12h14M5 18h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="8"
        height="14"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="13"
        y="5"
        width="8"
        height="14"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}
