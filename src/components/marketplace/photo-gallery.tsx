"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhotoGallery({ urls, title }: { urls: string[]; title: string }) {
  const [i, setI] = useState(0);
  if (!urls.length) {
    return <div className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-muted text-muted-foreground"><ImageOff className="size-8" /></div>;
  }
  return (
    <div className="space-y-2">
      <div className="aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
        <img src={urls[i]} alt={`${title}, photo ${i + 1}`} className="size-full object-contain" />
      </div>
      {urls.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {urls.map((u, k) => (
            <button key={u} onClick={() => setI(k)} aria-label={`Show photo ${k + 1}`}
              className={cn("size-16 shrink-0 overflow-hidden rounded-md border-2 cursor-pointer", k === i ? "border-primary" : "border-transparent opacity-70")}>
              <img src={u} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
