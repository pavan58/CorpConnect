import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { approveDomain, rejectDomain, resolveReport, setAmbassador, setUserRole, setUserStatus } from "@/features/admin/actions";
import { LaunchReadiness } from "@/components/admin/launch-readiness";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TARGET_LINK: Record<string, (id: string) => string | null> = {
  listing: (id) => `/marketplace/${id}`,
  job: (id) => `/jobs/${id}`,
  post: () => null, comment: () => null, user: () => null, message: () => null,
};

type Report = { id: string; target_type: string; target_id: string; reason: string; details: string | null; created_at: string; reporter: { full_name: string } | null };
type UserRow = { id: string; full_name: string; corporate_email: string; designation: string; verification_status: string; role: string; is_ambassador: boolean; member_number: number | null; signup_source: string | null; created_at: string; company: { name: string } | null };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireAdmin();
  const isAdmin = viewer.profile.role === "admin";
  const q = (await searchParams).q?.replace(/[%_,()]/g, " ").trim();
  const admin = createAdminClient();

  const count = (table: string, column: string, value: string) =>
    admin.from(table).select("id", { count: "exact", head: true }).eq(column, value);

  // Members (incl. corporate emails) are listed for admins only, not moderators.
  let usersQ = admin.from("profiles")
    .select("id, full_name, corporate_email, designation, verification_status, role, is_ambassador, member_number, signup_source, created_at, company:companies(name)")
    .order("created_at", { ascending: false }).limit(25);
  if (q) usersQ = usersQ.or(`full_name.ilike.%${q}%,corporate_email.ilike.%${q}%`);

  const [verified, pending, listings, jobs, reportsRes, domainsRes, companiesRes, usersRes] = await Promise.all([
    count("profiles", "verification_status", "verified_employee"),
    count("profiles", "verification_status", "unverified"),
    count("product_listings", "status", "active"),
    count("job_listings", "status", "open"),
    admin.from("user_reports").select("id, target_type, target_id, reason, details, created_at, reporter:profiles!user_reports_reporter_id_fkey(full_name)").eq("status", "open").order("created_at").limit(50),
    admin.from("company_domain_requests").select("id, domain, requested_email, company_hint, created_at").eq("status", "pending").order("created_at").limit(50),
    admin.from("companies").select("id, name").order("name"),
    isAdmin ? usersQ : Promise.resolve({ data: [] }),
  ]);
  const [{ data: sourceRows }, { data: zoneListings }, { data: hubJobs }] = await Promise.all([
    admin.from("profiles").select("signup_source, verification_status"),
    admin.from("product_listings").select("zone_code").eq("status", "active"),
    admin.from("job_listings").select("hub_code").eq("status", "open"),
  ]);
  const bySource = new Map<string, { total: number; verified: number }>();
  for (const r of sourceRows ?? []) {
    const k = r.signup_source ?? "direct";
    const e = bySource.get(k) ?? { total: 0, verified: 0 };
    e.total++; if (r.verification_status === "verified_employee") e.verified++;
    bySource.set(k, e);
  }
  const sources = [...bySource.entries()].sort((a, b) => b[1].verified - a[1].verified);
  const reports = (reportsRes.data ?? []) as unknown as Report[];
  const users = (usersRes.data ?? []) as unknown as UserRow[];
  // group pending domain requests by domain
  const domains = new Map<string, { id: string; count: number; first: string; sample: string; hint: string | null }>();
  for (const r of domainsRes.data ?? []) {
    const d = domains.get(r.domain);
    if (d) { d.count++; d.hint ??= r.company_hint; } else domains.set(r.domain, { id: r.id, count: 1, first: r.created_at, sample: r.requested_email, hint: r.company_hint });
  }

  const stats = [
    ["Verified employees", verified.count], ["Awaiting OTP", pending.count],
    ["Active listings", listings.count], ["Open jobs", jobs.count],
  ] as const;

  return (
    <>
      <PageHeader title="Admin" description="Moderation, company domains and members. Every action is written to the audit log." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-8">
        {stats.map(([l, v]) => (
          <Card key={l}><CardContent className="pt-5"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-semibold tabular-nums">{v ?? 0}</p></CardContent></Card>
        ))}
      </div>

      <LaunchReadiness
        listings={listings.count ?? 0}
        jobs={jobs.count ?? 0}
        members={verified.count ?? 0}
        hinjawadiListings={(zoneListings ?? []).filter((z) => z.zone_code === "hinjawadi").length}
        kharadiListings={(zoneListings ?? []).filter((z) => z.zone_code === "kharadi_magarpatta").length}
        hinjawadiJobs={(hubJobs ?? []).filter((j) => j.hub_code.startsWith("hinjawadi")).length}
        kharadiJobs={(hubJobs ?? []).filter((j) => ["kharadi_eon", "kharadi_wtc", "magarpatta"].includes(j.hub_code)).length}
      />

      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between sm:flex sm:space-y-0">
          <CardTitle>Sign-ups by channel</CardTitle>
          <Link href="/admin/marketing" className="text-sm font-medium text-primary">QR codes & campaign links →</Link>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? <p className="text-sm text-muted-foreground">No sign-ups yet.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1.5">Channel</th><th>Verified</th><th>Started sign-up</th></tr></thead>
              <tbody className="divide-y">
                {sources.map(([k, v]) => (
                  <tr key={k}><td className="py-1.5 font-mono text-xs">{k}</td><td className="font-semibold tabular-nums">{v.verified}</td><td className="tabular-nums text-muted-foreground">{v.total}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Open reports ({reports.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {reports.length === 0 ? <p className="text-sm text-muted-foreground">Nothing to review.</p> : reports.map((r) => {
              const href = TARGET_LINK[r.target_type]?.(r.target_id);
              return (
                <div key={r.id} className="rounded-md border p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span><Badge variant="destructive">{r.reason.replace("_", " ")}</Badge> <span className="capitalize">{r.target_type}</span> {href ? <Link href={href} className="text-primary">view</Link> : <code className="text-xs">{r.target_id.slice(0, 8)}</code>}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                  </div>
                  {r.details ? <p className="mt-1 text-muted-foreground">{r.details}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">by {r.reporter?.full_name}</p>
                  <form action={resolveReport} className="mt-2 flex gap-2">
                    <input type="hidden" name="reportId" value={r.id} />
                    <Button size="sm" variant="destructive" name="outcome" value="actioned">{r.target_type === "user" ? "Suspend user" : "Remove content"}</Button>
                    <Button size="sm" variant="outline" name="outcome" value="dismissed">Dismiss</Button>
                  </form>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Company domain requests ({domains.size})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {domains.size === 0 ? <p className="text-sm text-muted-foreground">No pending domains.</p> : [...domains.entries()].map(([domain, d]) => (
              <div key={domain} className="rounded-md border p-3 text-sm">
                <p><span className="font-medium">@{domain}</span> <span className="text-muted-foreground">· {d.count} signup attempt{d.count > 1 ? "s" : ""} · first {timeAgo(d.first)}</span></p>
                <p className="text-xs text-muted-foreground">e.g. {d.sample}{d.hint ? <> · says they work at <span className="font-medium text-foreground">{d.hint}</span></> : null}</p>
                {isAdmin ? (
                  <div className="mt-2 space-y-2">
                    <form action={approveDomain} className="flex flex-wrap gap-2">
                      <input type="hidden" name="requestId" value={d.id} />
                      <Select name="companyId" defaultValue="" className="h-8 flex-1 min-w-40 text-xs" aria-label="Existing company">
                        <option value="">New company…</option>
                        {(companiesRes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                      <Input name="newCompanyName" placeholder="New company name" defaultValue={d.hint ?? ""} className="h-8 flex-1 min-w-40 text-xs" />
                      <Button size="sm">Approve</Button>
                    </form>
                    <form action={rejectDomain.bind(null, d.id)}><Button size="sm" variant="ghost">Reject</Button></form>
                  </div>
                ) : null}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Check the domain is a real employer with a Pune presence before approving. Never approve free/personal mail providers.</p>
          </CardContent>
        </Card>
      </div>

      {isAdmin ? (
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between gap-3 sm:flex sm:space-y-0">
          <CardTitle>Members</CardTitle>
          <form className="flex gap-2"><Input name="q" defaultValue={q} placeholder="Search name or email" className="h-8 w-56 text-sm" /><Button size="sm" variant="secondary">Search</Button></form>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2 pr-3">Name</th><th className="pr-3">Company</th><th className="pr-3">Status</th><th className="pr-3">Role</th><th className="pr-3">Source</th><th /></tr></thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 pr-3"><p className="font-medium">{u.full_name}</p><p className="text-xs text-muted-foreground">{u.corporate_email}</p></td>
                  <td className="pr-3">{u.company?.name}</td>
                  <td className="pr-3"><Badge variant={u.verification_status === "verified_employee" ? "success" : u.verification_status === "suspended" ? "destructive" : "secondary"}>{u.verification_status.replace("_", " ")}</Badge></td>
                  <td className="pr-3 capitalize">{u.role}{u.is_ambassador ? <Badge className="ml-1">Ambassador</Badge> : null}</td>
                  <td className="pr-3 font-mono text-xs text-muted-foreground">{u.signup_source ?? "direct"}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {isAdmin && u.id !== viewer.id && u.role !== "admin" ? (
                      <span className="inline-flex gap-1">
                        {u.verification_status === "verified_employee" ? (
                          <form action={setUserStatus.bind(null, u.id, "suspended")}><Button size="sm" variant="ghost" className="text-destructive">Suspend</Button></form>
                        ) : u.verification_status === "suspended" ? (
                          <form action={setUserStatus.bind(null, u.id, "verified_employee")}><Button size="sm" variant="ghost">Reinstate</Button></form>
                        ) : null}
                        {u.verification_status === "verified_employee" ? (
                          <form action={setAmbassador.bind(null, u.id, !u.is_ambassador)}>
                            <Button size="sm" variant="ghost">{u.is_ambassador ? "Remove ambassador" : "Make ambassador"}</Button>
                          </form>
                        ) : null}
                        <form action={setUserRole.bind(null, u.id, u.role === "moderator" ? "member" : "moderator")}>
                          <Button size="sm" variant="ghost">{u.role === "moderator" ? "Remove mod" : "Make mod"}</Button>
                        </form>
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      ) : null}
    </>
  );
}
