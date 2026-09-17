"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { approveTimeEntry, createEmployee, deactivateEmployee, updateEmployee, upsertTimeEntry } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function ActionForm({
  action,
  children,
  success,
  className,
}: {
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string }>;
  children: React.ReactNode;
  success?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <form
      className={className}
      action={async (fd) => {
        const result = await action(fd);
        if (result?.error) toast.error(result.error);
        else {
          toast.success(success ?? "Saved");
          router.refresh();
        }
      }}
    >
      {children}
    </form>
  );
}

export { createEmployee, updateEmployee, deactivateEmployee, upsertTimeEntry, approveTimeEntry };
