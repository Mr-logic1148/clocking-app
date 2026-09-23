"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { homeForRole } from "@/lib/home";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/password-field";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");

  async function redirectAfterLogin() {
    const callback = params.get("callbackUrl");
    const session = await fetch("/api/auth/session").then((r) => r.json());
    if (callback) {
      router.push(callback);
    } else {
      router.push(homeForRole(session?.user?.role));
    }
    router.refresh();
  }

  async function onPassword(formData: FormData) {
    setBusy(true);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (result?.error) {
      toast.error("Invalid email or password");
      return;
    }
    toast.success("Signed in");
    await redirectAfterLogin();
  }

  async function onMagic(formData: FormData) {
    setBusy(true);
    try {
      const email = String(formData.get("email") ?? "");
      const res = await fetch("/api/auth/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not send link");
        return;
      }
      toast.success("If that account exists, a sign-in link is on its way.");
      if (data.previewUrl) {
        toast.message("Dev preview link is in the server log — opening it now.");
        window.location.href = data.previewUrl;
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 text-sm">
        <button
          type="button"
          className={`rounded-lg py-2 font-medium ${mode === "password" ? "bg-white shadow-sm" : "text-stone-500"}`}
          onClick={() => setMode("password")}
        >
          Password
        </button>
        <button
          type="button"
          className={`rounded-lg py-2 font-medium ${mode === "magic" ? "bg-white shadow-sm" : "text-stone-500"}`}
          onClick={() => setMode("magic")}
        >
          Magic link
        </button>
      </div>

      {mode === "password" ? (
        <form action={onPassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="admin@harvest.local" />
          </div>
          <PasswordField />
          <Button className="w-full" disabled={busy} type="submit">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : (
        <form action={onMagic} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="magic-email">Email</Label>
            <Input id="magic-email" name="email" type="email" required placeholder="maya@harvest.local" />
          </div>
          <p className="text-xs text-stone-500">
            Without SMTP configured, development prints a one-time link in the terminal.
          </p>
          <Button className="w-full" disabled={busy} type="submit">
            {busy ? "Sending…" : "Email me a link"}
          </Button>
        </form>
      )}
    </div>
  );
}
