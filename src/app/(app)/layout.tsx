import { requireVerified } from "@/lib/auth/guards";
import { AppNav, MobileNav } from "@/components/shell/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireVerified();
  const isStaff = viewer.profile.role === "admin" || viewer.profile.role === "moderator";
  return (
    <div className="min-h-dvh bg-muted pb-20 md:pb-0">
      <AppNav name={viewer.profile.full_name} company={viewer.profile.company?.name ?? ""} isStaff={isStaff} />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      <MobileNav />
    </div>
  );
}
