"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { homeForRole } from "@/lib/home";

export default function VerifyMagicPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setMessage("Missing sign-in token.");
      return;
    }
    void signIn("magic-link", { token, redirect: false }).then(async (result) => {
      if (result?.error) {
        setMessage("This link is invalid or expired.");
        return;
      }
      const session = await fetch("/api/auth/session").then((r) => r.json());
      router.replace(homeForRole(session?.user?.role));
    });
  }, [params, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <p className="text-stone-600">{message}</p>
    </main>
  );
}
