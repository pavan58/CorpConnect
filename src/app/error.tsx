"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-lg font-semibold">Something went wrong</p>
      <p className="text-sm text-muted-foreground">Please try again. {error.digest ? <span className="font-mono text-xs">Ref: {error.digest}</span> : null}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
