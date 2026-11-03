"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Briefcase, LogOut, MessagesSquare, Shield, ShoppingBag, User, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/ui/misc";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/communities", label: "Communities", icon: Users },
  { href: "/messages", label: "Messages", icon: MessagesSquare },
];

function useActive() {
  const path = usePathname();
  return (href: string) => path === href || path.startsWith(href + "/");
}

export function AppNav({ name, company, isStaff }: { name: string; company: string; isStaff: boolean }) {
  const active = useActive();
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo href="/marketplace" />
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              className={cn("rounded-md px-3 py-1.5 transition-colors", active(href) ? "text-primary font-semibold" : "text-foreground/80 hover:text-primary")}>
              {label}
            </Link>
          ))}
          {isStaff ? (
            <Link href="/admin" className={cn("rounded-md px-3 py-1.5 flex items-center gap-1", active("/admin") ? "text-primary font-semibold" : "text-foreground/80 hover:text-primary")}>
              <Shield className="size-3.5" /> Admin
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/profile" className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
            <Avatar name={name} className="size-8" />
            <span className="hidden lg:flex flex-col leading-tight text-left">
              <span className="text-sm font-medium flex items-center gap-1">{name}<BadgeCheck className="size-3.5 text-success" aria-label="Verified employee" /></span>
              <span className="text-xs text-muted-foreground">{company}</span>
            </span>
          </Link>
          <form action={signOut}>
            <button className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer" aria-label="Sign out" title="Sign out">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const active = useActive();
  const items = [...LINKS, { href: "/profile", label: "Profile", icon: User }];
  return (
    <nav className="print:hidden md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", active(href) ? "text-primary font-medium" : "text-muted-foreground")}>
              <Icon className="size-5" />{label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
