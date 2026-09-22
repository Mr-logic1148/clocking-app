import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  const unread = await prisma.auditLog.count({ where: { isReadByAdmin: false } });

  return (
    <div className="min-h-screen">
      <AdminNav
        email={session.user.email ?? ""}
        unreadAudits={unread}
        signOutAction={signOutAction}
      />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
