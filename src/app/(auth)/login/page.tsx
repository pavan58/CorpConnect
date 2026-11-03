import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in with your corporate email.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sp.reset ? <Alert tone="success">Password updated. Sign in with your new password.</Alert> : null}
        {sp.error === "suspended" ? <Alert tone="error">This account is suspended. Contact support@corpconnect.it.com.</Alert> : null}
        <LoginForm next={sp.next} />
        <div className="flex justify-between text-sm">
          <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">Forgot password?</Link>
          <Link href="/register" className="text-primary font-medium">Create account</Link>
        </div>
      </CardContent>
    </Card>
  );
}
