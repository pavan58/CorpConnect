"use client";

import { startTransition, useActionState, useMemo, useState, useTransition } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createListing } from "@/features/marketplace/actions";
import { MAX_PHOTOS } from "@/features/marketplace/schema";
import { initialState } from "@/lib/action-state";
import { CATEGORIES, CONDITIONS, PICKUP_POINTS, ZONES, CITY } from "@/lib/pune";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { Field, FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";

type Photo = { id: string; file: File; preview: string };

export function ListingForm({ userId, defaultZone }: { userId: string; defaultZone: string }) {
  const [state, action, pending] = useActionState(createListing, initialState);
  const [zone, setZone] = useState(defaultZone);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadError, setUploadError] = useState<string>();
  const [uploading, startUpload] = useTransition();
  const pickups = useMemo(() => PICKUP_POINTS.filter((p) => p.zone === zone), [zone]);
  const fe = state.fieldErrors ?? {};
  const busy = pending || uploading;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const room = MAX_PHOTOS - photos.length;
    const next = Array.from(list).slice(0, room).map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }));
    setPhotos((p) => [...p, ...next]);
  }

  function removePhoto(id: string) {
    setPhotos((p) => {
      const gone = p.find((x) => x.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return p.filter((x) => x.id !== id);
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(undefined);
    const formData = new FormData(e.currentTarget);
    startUpload(async () => {
      try {
        const supabase = createClient();
        // Straight to Supabase Storage from the browser (storage RLS: own folder,
        // verified only). Keeps image bytes out of the 4.5 MB serverless body limit.
        const paths = await Promise.all(
          photos.map(async (p) => {
            const blob = await compressImage(p.file);
            const path = `${userId}/${crypto.randomUUID()}.jpg`;
            const { error } = await supabase.storage.from("marketplace-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
            if (error) throw new Error(error.message);
            return path;
          }),
        );
        formData.set("imagePaths", JSON.stringify(paths));
        startTransition(() => action(formData)); // post-await: re-enter a transition
      } catch (err) {
        setUploadError(err instanceof Error ? `Photo upload failed: ${err.message}` : "Photo upload failed");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      {uploadError ? <Alert tone="error">{uploadError}</Alert> : null}

      <div className="space-y-1.5">
        <Label>Photos <span className="text-muted-foreground font-normal">({photos.length}/{MAX_PHOTOS})</span></Label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {photos.map((p, i) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
              <img src={p.preview} alt={`Photo ${i + 1}`} className="size-full object-cover" />
              {i === 0 ? <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] text-white">Cover</span> : null}
              <button type="button" onClick={() => removePhoto(p.id)} aria-label="Remove photo"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white cursor-pointer">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted">
              <ImagePlus className="size-5" /> Add
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          ) : null}
        </div>
        <FieldError errors={fe.imagePaths} />
      </div>

      <Field label="Title" htmlFor="title" errors={fe.title}>
        <Input id="title" name="title" placeholder="e.g. MacBook Air M2, 16GB / 512GB" maxLength={100} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="category" errors={fe.category}>
          <Select id="category" name="category" defaultValue="" required>
            <option value="" disabled>Select</option>
            {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Condition" htmlFor="condition" errors={fe.condition}>
          <Select id="condition" name="condition" defaultValue="" required>
            <option value="" disabled>Select</option>
            {CONDITIONS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 items-start">
        <Field label="Price (₹)" htmlFor="priceInr" errors={fe.priceInr}>
          <Input id="priceInr" name="priceInr" type="number" inputMode="numeric" min={0} max={1000000} step={1} required />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:mt-8">
          <input type="checkbox" name="negotiable" className="size-4 accent-[var(--color-primary)]" /> Price is negotiable
        </label>
      </div>

      <Field label="Description" htmlFor="description" errors={fe.description}>
        <Textarea id="description" name="description" rows={5} maxLength={2000} placeholder="Age, warranty, bill available, what's included, any defects…" required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pune zone" htmlFor="zoneCode" errors={fe.zoneCode} hint={`City: ${CITY}`}>
          <Select id="zoneCode" name="zoneCode" value={zone} onChange={(e) => setZone(e.target.value)} required>
            {ZONES.map((z) => <option key={z.code} value={z.code}>{z.name}</option>)}
          </Select>
        </Field>
        <Field label="Safe handover spot" htmlFor="pickupPoint" errors={fe.pickupPoint}>
          <Select id="pickupPoint" name="pickupPoint" key={zone} defaultValue={pickups[0]?.code} required>
            {pickups.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </Select>
        </Field>
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={busy || photos.length === 0}>
        {busy ? <><Loader2 className="animate-spin" />{uploading ? "Uploading photos…" : "Publishing…"}</> : "Publish listing"}
      </Button>
    </form>
  );
}
