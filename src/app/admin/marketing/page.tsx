import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { CHANNELS, channelUrl } from "@/features/marketing/channels";
import { qrSvg } from "@/features/marketing/qr";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing kit" };

export default async function MarketingKit() {
  await requireAdmin();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://corpconnect.it.com";
  const rows = await Promise.all(CHANNELS.map(async (c) => ({ c, url: channelUrl(base, c), svg: await qrSvg(channelUrl(base, c)) })));
  const groups = [...new Set(CHANNELS.map((c) => c.group))];

  return (
    <>
      <PageHeader
        title="Launch marketing kit"
        description={<>One tracked link and QR code per placement. Sign-ups show up under <Link className="text-primary" href="/admin">Sign-ups by channel</Link>.</>}
      />
      {groups.map((g) => (
        <section key={g} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{g}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.filter((r) => r.c.group === g).map(({ c, url, svg }) => (
              <Card key={c.src}>
                <CardHeader>
                  <CardTitle className="text-base">{c.label}</CardTitle>
                  <CardDescription>{c.placement}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="mx-auto w-36" dangerouslySetInnerHTML={{ __html: svg }} />
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">src={c.src}</Badge>
                    <Badge>{c.angle === "sell" ? "Marketplace angle" : c.angle === "referrals" ? "Referral angle" : "General"}</Badge>
                  </div>
                  <input readOnly value={url} aria-label="Tracked link" className="h-9 w-full rounded-md border bg-muted px-2 font-mono text-[11px]" />
                  {c.group === "On-ground" || c.group === "Commute" ? (
                    <div className="flex gap-2">
                      <Link href={`/admin/marketing/print?ch=${c.src}&layout=cards`} target="_blank" className={buttonVariants({ size: "sm" })}>Print flyers (4×A6)</Link>
                      <Link href={`/admin/marketing/print?ch=${c.src}&layout=standee`} target="_blank" className={buttonVariants({ size: "sm", variant: "secondary" })}>Standee (A5)</Link>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
