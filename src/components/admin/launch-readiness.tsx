import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Launch rule: don't push paid/public ads until the shelves aren't empty.
export const TARGETS = { listings: 40, jobs: 20, members: 100 } as const;

function Meter({ label, value, target, hint }: { label: string; value: number; target: number; hint?: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  const done = value >= target;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn("tabular-nums", done ? "text-success font-semibold" : "text-muted-foreground")}>{value} / {target}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", done ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function LaunchReadiness(p: {
  listings: number; jobs: number; members: number;
  hinjawadiListings: number; kharadiListings: number; hinjawadiJobs: number; kharadiJobs: number;
}) {
  const ready = p.listings >= TARGETS.listings && p.jobs >= TARGETS.jobs;
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Launch readiness {ready ? "✅" : ""}</CardTitle>
        <CardDescription>
          {ready
            ? "Shelves are stocked. You're clear to start public ads."
            : "Seed real supply before public ads: an empty marketplace leaks traffic. Ask ambassadors to list genuine items and post real openings."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-3">
        <Meter label="Active listings" value={p.listings} target={TARGETS.listings} hint={`Hinjawadi ${p.hinjawadiListings} · Kharadi/Magarpatta ${p.kharadiListings}`} />
        <Meter label="Open jobs" value={p.jobs} target={TARGETS.jobs} hint={`Hinjawadi ${p.hinjawadiJobs} · Kharadi/Magarpatta ${p.kharadiJobs}`} />
        <Meter label="Verified members" value={p.members} target={TARGETS.members} />
      </CardContent>
    </Card>
  );
}
