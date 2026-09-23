import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { ManagerNav } from "@/components/manager-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    redirect("/login");
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-[#f6f3ee]">
      <ManagerNav name={session.user.name ?? ""} signOutAction={signOutAction} />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
