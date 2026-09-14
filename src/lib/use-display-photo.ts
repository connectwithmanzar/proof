"use client";

import { useEffect, useState } from "react";
import type { PhotoKind } from "@/lib/photo-db";
import { getDisplayPhoto } from "@/lib/repo";

export function useDisplayPhoto(
  id: string | undefined,
  kind: PhotoKind = "front",
): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setSrc(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    getDisplayPhoto(id, kind)
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

  return src;
}
