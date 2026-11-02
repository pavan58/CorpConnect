"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type CompanyOption = { id: string; name: string; domains: string[] };

/** What the user picked: a known company, or a name they typed themselves. */
export type CompanyValue = { id: string; name: string } | { id: ""; name: string };

const MAX_RESULTS = 8;

function normalize(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Searchable company picker (ARIA combobox). Matches on company name and on
 * email domain ("nice" → NICE, "ril" → Reliance). If nothing fits, the user can
 * add their company by name; the server then logs it for admin review.
 * Submits as hidden `companyId` (known company) or `companyName` (custom).
 */
export function CompanyCombobox({
  companies, value, onChange, invalid, describedBy,
}: {
  companies: CompanyOption[];
  value: CompanyValue | null;
  onChange: (v: CompanyValue | null) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);

  // Keep the text in sync when the parent picks a company (email auto-detect).
  useEffect(() => { if (value) setQuery(value.name); }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = normalize(query);
  const results = useMemo(() => {
    if (!q) return companies.slice(0, MAX_RESULTS);
    const scored = companies
      .map((c) => {
        const n = normalize(c.name);
        const score = n.startsWith(q) ? 0
          : n.split(" ").some((w) => w.startsWith(q)) ? 1
          : n.includes(q) ? 2
          : c.domains.some((d) => d.startsWith(q.replace(/ /g, ""))) ? 3
          : -1;
        return { c, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name));
    return scored.slice(0, MAX_RESULTS).map((x) => x.c);
  }, [companies, q]);

  const exact = results.find((c) => normalize(c.name) === q);
  const canAdd = query.trim().length >= 2 && !exact;
  const optionCount = results.length + (canAdd ? 1 : 0);

  function pick(i: number) {
    if (i < results.length) {
      const c = results[i]!;
      onChange({ id: c.id, name: c.name });
      setQuery(c.name);
    } else if (canAdd) {
      onChange({ id: "", name: query.trim() });
    }
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, optionCount - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && open && optionCount) { e.preventDefault(); pick(active); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div ref={wrapper} className="relative">
      <input type="hidden" name="companyId" value={value?.id ?? ""} />
      <input type="hidden" name="companyName" value={value && !value.id ? value.name : ""} />
      <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id="companySearch"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && optionCount ? `${listId}-${active}` : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        autoComplete="off"
        placeholder="Search your company, e.g. NICE, Perforce, Jio"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
          if (value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn(
          "h-10 w-full rounded-md border border-input bg-card pl-9 pr-9 text-sm placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring aria-[invalid=true]:border-destructive",
        )}
      />
      <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

      {open && optionCount > 0 ? (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-card p-1 shadow-lg">
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={value?.id === c.id}
              onMouseDown={(e) => { e.preventDefault(); pick(i); }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center justify-between gap-2 rounded px-2.5 py-2 text-sm", i === active && "bg-accent text-accent-foreground")}
            >
              <span className="truncate">{c.name} <span className="text-xs text-muted-foreground">@{c.domains[0]}</span></span>
              {value?.id === c.id ? <Check className="size-4 shrink-0 text-primary" /> : null}
            </li>
          ))}
          {canAdd ? (
            <li
              id={`${listId}-${results.length}`}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => { e.preventDefault(); pick(results.length); }}
              onMouseEnter={() => setActive(results.length)}
              className={cn("flex cursor-pointer items-center gap-2 rounded border-t px-2.5 py-2 text-sm text-primary", active === results.length && "bg-accent")}
            >
              <Plus className="size-4 shrink-0" /> Add “{query.trim()}” as my company
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
