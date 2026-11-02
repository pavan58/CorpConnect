import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { getViewer } from "@/lib/auth/guards";
import { VerifyForm } from "@/components/auth/verify-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Verify your work email" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/verify");
  if (viewer.profile?.verification_status === "verified_employee") redirect("/marketplace");
  const { error } = await searchParams;

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <MailCheck className="size-6" />
        </span>
        <CardTitle className="text-xl pt-2">Check your work inbox</CardTitle>
        <CardDescription>
          We sent a 6-digit code to <span className="font-medium text-foreground">{viewer.email}</span>. It expires in 10 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VerifyForm initialError={error} />
        <form action={signOut} className="mt-6 text-center">
          <button className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Wrong email? Sign out and start again</button>
        </form>
        <p className="mt-4 text-xs text-center text-muted-foreground">
          Not seeing it? Check spam or quarantine. Some company mail filters hold new senders for a few minutes.
        </p>
      </CardContent>
    </Card>
  );
}
