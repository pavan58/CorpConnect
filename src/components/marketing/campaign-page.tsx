import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";

export type CampaignPoint = { icon: LucideIcon; title: string; body: string };

/** Shared layout for campaign landing pages (QR flyers, ads). */
export function CampaignPage({ eyebrow, title, subtitle, cta, points, footnote }: {
  eyebrow: string; title: string; subtitle: string; cta: string; points: CampaignPoint[]; footnote: string;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="relative z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm", className: "h-9" })}>Sign in</Link>
        </div>
      </header>
      <section className="relative overflow-hidden">
        <div aria-hidden className="ribbon pointer-events-none absolute -right-24 -top-80 hidden h-[64rem] w-[18rem] rotate-[38deg] opacity-90 md:block" />
        <div aria-hidden className="ribbon pointer-events-none absolute -right-28 -top-40 h-[30rem] w-[8rem] rotate-[38deg] opacity-70 md:hidden" />
        <div className="relative mx-auto max-w-6xl border-x px-4 sm:px-10 pt-14 pb-16 sm:pt-24 sm:pb-24">
          <p className="text-sm font-semibold text-primary">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-normal leading-[1.1] sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-heading-muted sm:text-xl">{subtitle}</p>
          <Link href="/register" className={buttonVariants({ size: "lg", className: "group mt-9 h-12 px-6" })}>
            {cta} <ChevronRight className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">{footnote}</p>
        </div>
      </section>
      <section className="border-t bg-muted">
        <div className="mx-auto grid max-w-6xl gap-px border-x bg-border sm:grid-cols-3">
          {points.map(({ icon: Icon, title: t, body }) => (
            <div key={t} className="bg-muted px-6 py-10 sm:px-10">
              <Icon className="size-6 text-primary" />
              <h2 className="mt-4 text-lg font-normal">{t}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl justify-between border-x px-4 sm:px-10 py-6 text-sm text-muted-foreground">
          <span>CorpConnect · Pune</span>
          <Link href="/" className="hover:text-foreground">What is CorpConnect?</Link>
        </div>
      </footer>
    </div>
  );
}
