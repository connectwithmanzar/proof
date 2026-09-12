"use client";

import { useEffect, useState } from "react";
import { getPhoto, type PhotoKind } from "@/lib/photo-db";

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
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    getPhoto(id, kind)
      .then((blob) => {
        if (!blob) return;
        const next = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(next);
          return;
        }
        objectUrl = next;
        setSrc(next);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setSrc(null);
    };
  }, [id, kind]);

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
    // Blob URLs from IndexedDB cannot be optimized by next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
