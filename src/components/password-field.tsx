"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordField({
  id = "password",
  name = "password",
  label = "Password",
  required = true,
  className,
}: {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          autoComplete="current-password"
          className="pr-12"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-stone-500 hover:text-stone-900"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
