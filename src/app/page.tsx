import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Briefcase, ChevronRight, MapPin, MessagesSquare, ShieldCheck, ShoppingBag, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ZONES } from "@/lib/pune";
import { cn } from "@/lib/utils";

export default async function Home() {
  const viewer = await getViewer();
  if (viewer?.profile?.verification_status === "verified_employee") redirect("/marketplace");

  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("name, company_domains!inner(domain)")
    .order("name");
  const employerNames = (companies ?? []).map((c) => c.name);
  const marquee = ["Tata Consultancy Services", "Infosys", "Wipro", "Cognizant", "NICE", "Persistent Systems", "Barclays"]
    .filter((n) => employerNames.includes(n));

  const features = [
    { icon: ShoppingBag, art: "art-violet", title: "Electronics marketplace", body: "Buy and sell laptops, phones and gear with people from your own tech park. Hand over at a known gate or lobby." },
    { icon: Briefcase, art: "art-sunset", title: "Structured referrals", body: "Employees post openings at their company. Request a referral and track it from requested to referred." },
    { icon: Users, art: "art-ocean", title: "Pune tech communities", body: "Hinjawadi Developers, Kharadi & Magarpatta Infra Hub, Pune Tech Circle and more." },
    { icon: MessagesSquare, art: "art-mint", title: "Private 1-on-1 chat", body: "Realtime messaging that only the two people in the conversation can read." },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <header className="relative z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <a href="#features" className="hover:text-primary">Features</a>
            <a href="#pune" className="hover:text-primary">Pune hubs</a>
            <a href="#how" className="hover:text-primary">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm", className: "h-9 border-0 sm:border" })}>Sign in</Link>
            <Link href="/register" className={buttonVariants({ size: "sm", className: "h-9 group" })}>
              Join <ChevronRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero framed by thin vertical guide lines */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
            <div className="ribbon absolute -right-24 -top-80 h-[72rem] w-[22rem] rotate-[38deg] opacity-95" />
            <div className="ribbon absolute right-40 -top-96 h-[60rem] w-[9rem] rotate-[38deg] opacity-60 blur-[2px]" />
          </div>
          <div aria-hidden className="ribbon pointer-events-none absolute -right-28 -top-40 h-[34rem] w-[10rem] rotate-[38deg] opacity-80 md:hidden" />
          <div className="relative mx-auto max-w-6xl border-x px-4 sm:px-10 pt-16 pb-20 sm:pt-28 sm:pb-28">
            <p className="text-sm font-medium">
              Now live in Pune <span className="text-muted-foreground">· {employerNames.length || 40}+ employers verified by work email</span>
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-light leading-[1.1] sm:text-6xl">
              <span className="font-normal text-foreground">The private network for Pune&apos;s tech workforce.</span>{" "}
              <span className="text-heading-muted">Buy, sell, refer and connect across every IT park — verified by your work email.</span>
            </h1>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/register" className={buttonVariants({ size: "lg", className: "group h-12 px-6" })}>
                Verify with work email <ChevronRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/login" className="group inline-flex items-center gap-1 text-sm font-medium text-primary">
                I already have an account <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-success" /> No ID cards, payslips or uploads. Gmail, Outlook and other personal addresses aren&apos;t accepted.
            </p>
          </div>
        </section>

        {/* Employer strip */}
        <section className="border-y bg-background">
          <div className="mx-auto max-w-6xl border-x px-4 sm:px-10 py-7">
            <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-base font-semibold tracking-tight text-heading-muted/80 sm:justify-between">
              {marquee.map((n) => <li key={n}>{n}</li>)}
              <li className="text-sm font-medium text-primary">+ {Math.max(employerNames.length - marquee.length, 0)} more</li>
            </ul>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-muted">
          <div className="mx-auto max-w-6xl border-x px-4 sm:px-10 py-20">
            <h2 className="max-w-3xl text-3xl font-light sm:text-4xl">
              <span className="font-normal">Everything a Pune techie needs.</span>{" "}
              <span className="text-heading-muted">One trusted network, where everyone is a verified employee.</span>
            </h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {features.map(({ icon: Icon, art, title, body }) => (
                <article key={title} className="overflow-hidden rounded-lg border bg-card shadow-[0_2px_5px_-1px_rgba(50,50,93,0.12),0_1px_3px_-1px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_13px_27px_-5px_rgba(50,50,93,0.2),0_8px_16px_-8px_rgba(0,0,0,0.2)]">
                  <div className={cn("flex h-40 items-center justify-center", art)}>
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-white/80 text-primary shadow-sm backdrop-blur">
                      <Icon className="size-6" />
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-normal">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Pune hubs */}
        <section id="pune" className="border-t">
          <div className="mx-auto max-w-6xl border-x px-4 sm:px-10 py-20">
            <p className="text-sm font-semibold text-primary">Pune only, for now</p>
            <h2 className="mt-2 max-w-3xl text-3xl font-light sm:text-4xl">
              <span className="font-normal">Built around Pune&apos;s tech corridors.</span>{" "}
              <span className="text-heading-muted">Listings, jobs and communities are local to where you work.</span>
            </h2>
            <ul className="mt-10 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {ZONES.map((z) => (
                <li key={z.code} className="flex items-center gap-3 bg-card px-5 py-4 text-sm">
                  <MapPin className="size-4 shrink-0 text-primary" /> {z.name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works — dark band */}
        <section id="how" className="bg-[#0a2540] text-white">
          <div className="relative mx-auto max-w-6xl border-x border-white/10 px-4 sm:px-10 py-20">
            <div aria-hidden className="ribbon-soft pointer-events-none absolute inset-0 opacity-60" />
            <div className="relative">
              <p className="text-sm font-semibold text-[#8c85ff]">How verification works</p>
              <h2 className="mt-2 max-w-3xl text-3xl font-light sm:text-4xl">
                <span className="font-normal">Three steps, under a minute.</span>{" "}
                <span className="text-[#adbdcc]">Your company inbox is the only proof we need.</span>
              </h2>
              <ol className="mt-12 grid gap-8 sm:grid-cols-3">
                {[
                  ["Register", "Name, work email, company, designation and your Pune hub."],
                  ["Enter the code", "We email a 6-digit code to your corporate inbox. It expires in 10 minutes."],
                  ["You're verified", "Your profile gets the Verified employee badge. Start buying, selling and referring."],
                ].map(([t, b], i) => (
                  <li key={t} className="border-l border-white/15 pl-5">
                    <span className="text-sm font-semibold text-[#8c85ff]">0{i + 1}</span>
                    <h3 className="mt-2 flex items-center gap-1.5 text-lg font-normal">{t}{i === 2 ? <BadgeCheck className="size-4 text-[#5ee0a9]" /> : null}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#adbdcc]">{b}</p>
                  </li>
                ))}
              </ol>
              <Link href="/register" className="group mt-12 inline-flex h-12 items-center gap-2 rounded-md bg-white px-6 text-base font-medium text-[#0a2540] shadow-sm transition-colors hover:bg-[#e6ebf1] [&_svg]:size-4">
                Get verified <ChevronRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 border-x px-4 sm:px-10 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} CorpConnect · Pune, Maharashtra</span>
          <span className="flex gap-5"><Link href="/privacy" className="hover:text-foreground">Privacy</Link><Link href="/terms" className="hover:text-foreground">Terms</Link></span>
        </div>
      </footer>
    </div>
  );
}
