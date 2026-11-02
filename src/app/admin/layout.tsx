import { requireAdmin } from "@/lib/auth/guards";
import { AppNav } from "@/components/shell/app-nav";

export const metadata = { title: "Admin", robots: { index: false } };

// Server-side gate for every /admin page. Admin server actions check again.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <AppNav name={viewer.profile.full_name} company={viewer.profile.company?.name ?? ""} isStaff />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
