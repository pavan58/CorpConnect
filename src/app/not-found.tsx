import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-5xl font-semibold">404</p>
      <p className="text-muted-foreground">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/marketplace" className={buttonVariants()}>Back to CorpConnect</Link>
    </div>
  );
}
