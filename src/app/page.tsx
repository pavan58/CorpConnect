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
    { icon: ShoppingBag, title: "Electronics marketplace", body: "Buy and sell laptops, phones and gear with people from your own tech park. Hand over at a known gate or lobby." },
    { icon: Briefcase, title: "Structured referrals", body: "Employees post openings at their company. Request a referral and track it from requested to referred." },
    { icon: Users, title: "Pune tech communities", body: "Hinjawadi Developers, Kharadi & Magarpatta Infra Hub, Pune Tech Circle and more." },
    { icon: MessagesSquare, title: "Private 1-on-1 chat", body: "Realtime messaging that only the two people in the conversation can read." },
  ];

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>Sign in</Link>
          <Link href="/register" className={buttonVariants()}>Join</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-16 sm:pt-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <MapPin className="size-3.5" /> Now live in Pune
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
              The private network for Pune&apos;s verified tech workforce.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Sign up with your work email, enter the 6-digit code we send to your company inbox, and you&apos;re in.
              No ID cards, no payslips, no uploads.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>Verify with work email</Link>
              <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>I have an account</Link>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-success" /> Personal addresses (Gmail, Outlook, Yahoo, iCloud) are not accepted.
            </p>
          </div>
        </section>

        <section className="border-y bg-card">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <Icon className="size-6 text-primary" />
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
              <li key={z.code} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
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
              <li key={t} className="rounded-lg border bg-card p-5">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">{i + 1}</span>
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
