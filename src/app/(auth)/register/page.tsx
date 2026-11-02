import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm, type CompanyOption } from "@/components/auth/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Join with your work email" };

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, name, company_domains(domain)")
    .order("name");

  const companies: CompanyOption[] = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    domains: (c.company_domains as { domain: string }[]).map((d) => d.domain),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Join CorpConnect Pune</CardTitle>
        <CardDescription>
          We verify you with a 6-digit code sent to your company inbox. No ID card or documents needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm companies={companies} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already a member? <Link href="/login" className="text-primary font-medium">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
