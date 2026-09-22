"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { REASON_MIN } from "@/lib/access-constants";

export function ReasonNoteForm({
  action,
  extraFields,
  submitLabel,
  success,
  children,
}: {
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string }>;
  extraFields?: React.ReactNode;
  submitLabel: string;
  success?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        {submitLabel}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
          <form
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            action={async (fd) => {
              setBusy(true);
              const result = await action(fd);
              setBusy(false);
              if (result?.error) {
                toast.error(result.error);
                return;
              }
              toast.success(success ?? "Saved with audit note");
              setOpen(false);
              router.refresh();
            }}
          >
            {extraFields}
            {children}
            <div className="space-y-1.5">
              <Label htmlFor="reasonNote">Audit reason (required)</Label>
              <textarea
                id="reasonNote"
                name="reasonNote"
                required
                minLength={REASON_MIN}
                rows={4}
                placeholder="Minimum 10 characters — this is sent to Admins."
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
              <p className="text-xs text-stone-500">
                Managers cannot save overrides without a reason note.
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
