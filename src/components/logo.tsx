import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <defs><linearGradient id="cc-logo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--color-primary)" /><stop offset="1" stopColor="var(--color-sky)" /></linearGradient></defs>
        <rect width="32" height="32" rx="8" fill="url(#cc-logo)" />
        <path d="M10 11.5a5.5 5.5 0 0 1 9.4-3.9M22 20.5a5.5 5.5 0 0 1-9.4 3.9" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <circle cx="11" cy="20" r="2.4" fill="#fff" />
        <circle cx="21" cy="12" r="2.4" fill="#fff" />
      </svg>
      <span>CorpConnect <span className="text-muted-foreground font-normal">Pune</span></span>
    </Link>
  );
}
