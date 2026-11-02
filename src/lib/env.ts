import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}`);
  return v;
}

export const serverEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  otpSecret: () => {
    const v = required("OTP_SECRET");
    if (v.length < 32) throw new Error("OTP_SECRET must be at least 32 characters");
    return v;
  },
  resendApiKey: () => process.env.RESEND_API_KEY ?? "",
  resendFrom: () => process.env.RESEND_FROM_EMAIL ?? "CorpConnect <no-reply@corpconnect.in>",
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  isProd: () => process.env.NODE_ENV === "production",
};
