"use client";

import type { PhotoKind } from "@/lib/photo-db";
import { useDisplayPhoto } from "@/lib/use-display-photo";

type PhotoThumbProps = {
  id: string;
  kind?: PhotoKind;
  alt: string;
  className?: string;
};

export function PhotoThumb({
  id,
  kind = "front",
  alt,
  className,
}: PhotoThumbProps) {
  const src = useDisplayPhoto(id, kind);

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-900 text-xs text-zinc-600 ${className ?? ""}`}
        aria-hidden
      >
        …
      </div>
    );
  }

  return (
    // Private blobs from IndexedDB or a signed storage download.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
