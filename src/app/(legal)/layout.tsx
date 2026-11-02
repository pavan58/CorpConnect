import { Logo } from "@/components/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto max-w-3xl px-4 sm:px-6 py-4"><Logo /></header>
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pb-16 text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:font-semibold [&_p]:mt-3 [&_li]:mt-1 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 text-muted-foreground [&_h1]:text-foreground [&_h2]:text-foreground">
        {children}
      </main>
    </div>
  );
}
