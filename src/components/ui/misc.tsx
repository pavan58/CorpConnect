import type { ReactNode } from "react";
import { cn, initials } from "@/lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold", className)}
    >
      {initials(name)}
    </span>
  );
}

export function Alert({ tone = "info", children, className }: { tone?: "info" | "error" | "success"; children: ReactNode; className?: string }) {
  const tones = {
    info: "bg-accent text-accent-foreground",
    error: "bg-destructive-soft text-destructive",
    success: "bg-success-soft text-success",
  };
  return <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-md px-3 py-2 text-sm", tones[tone], className)}>{children}</div>;
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 px-6 text-center">
      {icon ? <div className="mb-3 text-muted-foreground [&_svg]:size-8">{icon}</div> : null}
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted-foreground max-w-sm">{children}</div> : null}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}
