import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh flex flex-col overflow-hidden bg-muted">
      <div aria-hidden className="ribbon pointer-events-none absolute -right-20 -top-72 h-[56rem] w-[14rem] rotate-[38deg] opacity-50" />
      <header className="relative px-4 sm:px-6 py-4"><Logo /></header>
      <main className="relative flex-1 flex items-start sm:items-center justify-center px-4 pb-12 pt-4">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
