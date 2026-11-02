import type { Metadata } from "next";
import { BadgeCheck, Building2, Mail, MapPin } from "lucide-react";
import { requireVerified } from "@/lib/auth/guards";
import { hubName } from "@/lib/pune";
import { ProfileForm } from "@/components/profile/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const viewer = await requireVerified();
  const p = viewer.profile;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Your profile" />
      <Card>
        <CardContent className="pt-5 flex items-center gap-4">
          <Avatar name={p.full_name} className="size-14 text-base" />
          <div className="space-y-1 text-sm">
            <p className="text-lg font-semibold">{p.full_name}</p>
            <Badge variant="success"><BadgeCheck /> Verified employee</Badge>
            <p className="flex items-center gap-1.5 text-muted-foreground"><Building2 className="size-4" />{p.designation} · {p.company?.name}</p>
            <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="size-4" />{hubName(p.work_location_pune)}, Pune</p>
            <p className="flex items-center gap-1.5 text-muted-foreground"><Mail className="size-4" />{viewer.email} <span className="text-xs">(only visible to you)</span></p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Edit details</CardTitle></CardHeader>
        <CardContent><ProfileForm profile={p} /></CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Changed company? Register again with your new work email. Your company and verification come from your corporate email and can&apos;t be edited here.
      </p>
      <form action={signOut}><Button variant="outline">Sign out</Button></form>
    </div>
  );
}
