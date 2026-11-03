import { notFound } from "next/navigation";
import { BadgeCheck, Check } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { CHANNELS, COPY, channelUrl } from "@/features/marketing/channels";
import { qrSvg } from "@/features/marketing/qr";
import { PrintButton } from "@/components/admin/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Print flyers", robots: { index: false } };

function Flyer({ svg, angle, short, big }: { svg: string; angle: keyof typeof COPY; short: string; big?: boolean }) {
  const copy = COPY[angle];
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-xl border border-[#e6ebf1] bg-white text-[#0a2540] ${big ? "p-10" : "p-6"}`}>
      <div aria-hidden className="ribbon absolute -right-10 -top-24 h-72 w-16 rotate-[38deg] opacity-90" />
      <p className={`relative font-semibold text-[#533afd] ${big ? "text-base" : "text-xs"}`}>CorpConnect · Pune</p>
      <h2 className={`relative mt-2 font-semibold leading-tight ${big ? "text-4xl" : "text-xl"}`}>{copy.headline}</h2>
      <p className={`relative mt-2 text-[#425466] ${big ? "text-lg" : "text-[11px] leading-snug"}`}>{copy.sub}</p>
      <ul className={`relative mt-5 space-y-2 ${big ? "text-lg" : "text-xs"}`}>
        {copy.points.map((pt) => (
          <li key={pt} className="flex items-center gap-2">
            <span className={`flex shrink-0 items-center justify-center rounded-full bg-[#f0eeff] text-[#533afd] ${big ? "size-7" : "size-5"}`}><Check className={big ? "size-4" : "size-3"} /></span>
            {pt}
          </li>
        ))}
      </ul>
      <div className="relative mt-auto flex items-end gap-4 pt-4">
        <div className={big ? "w-60" : "w-32"} dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="pb-1">
          <p className={`font-semibold ${big ? "text-xl" : "text-sm"}`}>{copy.cta}</p>
          <p className={`font-mono text-[#533afd] ${big ? "text-base" : "text-[10px]"}`}>{short}</p>
          <p className={`mt-1 flex items-center gap-1 text-[#425466] ${big ? "text-sm" : "text-[9px]"}`}>
            <BadgeCheck className={big ? "size-4" : "size-3"} /> Work-email verified · no ID cards
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ ch?: string; layout?: string }> }) {
  await requireAdmin();
  const { ch, layout } = await searchParams;
  const c = CHANNELS.find((x) => x.src === ch);
  if (!c) notFound();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://corpconnect.it.com";
  const url = channelUrl(base, c);
  const svg = await qrSvg(url);
  const short = new URL(base).host + (c.angle === "general" ? "" : c.angle === "sell" ? "/sell" : "/referrals");
  const standee = layout === "standee";

  return (
    <div>
      <style>{`@page { size: ${standee ? "A5 portrait" : "A4 portrait"}; margin: ${standee ? "0" : "8mm"}; } @media print { body { background: #fff !important; } }`}</style>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">{c.label} · {standee ? "A5 standee" : "4 × A6 flyers on A4"} · QR → <span className="font-mono">{url}</span></p>
        <PrintButton />
      </div>
      {standee ? (
        <div className="mx-auto h-[210mm] w-[148mm] print:h-[210mm] print:w-[148mm] [&>div]:h-full">
          <Flyer svg={svg} angle={c.angle} short={short} big />
        </div>
      ) : (
        <div className="mx-auto grid w-[194mm] grid-cols-2 gap-[6mm] [&>div]:h-[136mm]">
          {[0, 1, 2, 3].map((i) => <Flyer key={i} svg={svg} angle={c.angle} short={short} />)}
        </div>
      )}
    </div>
  );
}
