import { Suspense } from "react";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/" className="mb-2 flex items-center gap-2 text-emerald-800">
            <Leaf className="h-5 w-5" /> Harvest Clock
          </Link>
          <CardTitle>Sign in</CardTitle>
          <p className="text-sm text-stone-500">
            Admins land on the live board. Managers land on the floor hub. Employees only see their own hours.
          </p>
        </CardHeader>
        <CardContent>
          <Suspense>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
