import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>We&apos;ll email a 6-digit code to your corporate inbox.</CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm"><Link href="/login" className="text-muted-foreground hover:text-foreground">Back to sign in</Link></p>
      </CardContent>
    </Card>
  );
}
