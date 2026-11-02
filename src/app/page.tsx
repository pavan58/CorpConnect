import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Briefcase, MapPin, MessagesSquare, ShieldCheck, ShoppingBag, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/guards";
import { ZONES } from "@/lib/pune";

export default async function Home() {
  const viewer = await getViewer();
  if (viewer?.profile?.verification_status === "verified_employee") redirect("/marketplace");

  const features = [
    { icon: ShoppingBag, tone: "bg-accent text-accent-foreground", title: "Electronics marketplace", body: "Buy and sell laptops, phones and gear with people from your own tech park. Hand over at a known gate or lobby." },
    { icon: Briefcase, tone: "bg-highlight-soft text-highlight", title: "Structured referrals", body: "Employees post openings at their company. Request a referral and track it from requested to referred." },
    { icon: Users, tone: "bg-sky/15 text-sky", title: "Pune tech communities", body: "Hinjawadi Developers, Kharadi & Magarpatta Infra Hub, Pune Tech Circle and more." },
    { icon: MessagesSquare, tone: "bg-success-soft text-success", title: "Private 1-on-1 chat", body: "Realtime messaging that only the two people in the conversation can read." },
  ];

  return (
    <div className="min-h-dvh bg-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>Sign in</Link>
          <Link href="/register" className={buttonVariants()}>Join</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 pt-12 pb-16 sm:pt-20 lg:grid-cols-[1.15fr_1fr]">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <MapPin className="size-3.5" /> Now live in Pune
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
              The private network for Pune&apos;s <span className="text-gradient">verified tech workforce.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Sign up with your work email, enter the 6-digit code we send to your company inbox, and you&apos;re in.
              No ID cards, no payslips, no uploads.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className={buttonVariants({ size: "lg", className: "shadow-lg shadow-primary/25" })}>Verify with work email</Link>
              <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>I have an account</Link>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-success" /> Personal addresses (Gmail, Outlook, Yahoo, iCloud) are not accepted.
            </p>
          </div>
          <HeroPreview />
        </section>

        <section className="border-y bg-card/80 backdrop-blur">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, tone, title, body }) => (
              <div key={title} className="rounded-lg p-1">
                <span className={`inline-flex size-11 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" /></span>
                <h2 className="mt-3 font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
          <h2 className="text-xl font-semibold">Built around Pune&apos;s tech corridors</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ZONES.map((z) => (
              <li key={z.code} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <MapPin className="size-4 text-primary shrink-0" /> {z.name}
              </li>
            ))}
          </ul>

          <ol className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              ["Register", "Name, work email, company, designation and your Pune hub."],
              ["Enter the code", "We email a 6-digit code to your corporate inbox. It expires in 10 minutes."],
              ["You're verified", "Your profile shows the Verified employee badge. Start buying, selling and referring."],
            ].map(([t, b], i) => (
              <li key={t} className="relative overflow-hidden rounded-lg border bg-card p-5 shadow-sm">
                <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-sky to-highlight" />
                <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-sky text-white text-sm font-semibold shadow">{i + 1}</span>
                <h3 className="mt-3 font-semibold flex items-center gap-1.5">{t}{i === 2 ? <BadgeCheck className="size-4 text-success" /> : null}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 sm:px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} CorpConnect · Pune, Maharashtra</span>
          <span className="flex gap-4"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></span>
        </div>
      </footer>
    </div>
  );
}

/** Decorative preview of the app (sample content, not real data). */
function HeroPreview() {
  return (
    <div aria-hidden className="relative hidden h-[27rem] lg:block">
      <div className="absolute right-6 top-0 w-72 rotate-2 overflow-hidden rounded-2xl border bg-card shadow-xl">
        <div className="flex h-36 items-center justify-center bg-gradient-to-br from-accent via-sky/20 to-highlight-soft">
          <ShoppingBag className="size-12 text-primary/70" />
        </div>
        <div className="space-y-1 p-4">
          <p className="text-lg font-semibold">₹72,000</p>
          <p className="text-sm font-medium">MacBook Air M2 · 16GB</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> EON Kharadi Gate 1</p>
        </div>
      </div>
      <div className="absolute left-0 top-[17.5rem] w-64 -rotate-2 rounded-2xl border bg-card p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Backend Engineer</p>
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Referred</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Hinjawadi Phase 3 · Hybrid · 3–6 yrs</p>
        <div className="mt-3 h-1.5 rounded-full bg-muted"><div className="h-full w-full rounded-full bg-gradient-to-r from-primary to-sky" /></div>
      </div>
      <div className="absolute bottom-0 right-0 w-60 space-y-2 rounded-2xl border bg-card p-4 shadow-xl">
        <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm border bg-muted px-3 py-1.5 text-xs">Is it still available?</div>
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-1.5 text-xs text-primary-foreground">Yes! Gate 1 at 6pm? 👋</div>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><BadgeCheck className="size-3 text-success" /> Both verified employees</p>
      </div>
    </div>
  );
}
