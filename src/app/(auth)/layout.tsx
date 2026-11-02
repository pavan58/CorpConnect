import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-hero">
      <header className="px-4 sm:px-6 py-4"><Logo /></header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 pb-12 pt-4">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
