import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaveRequestForm } from "@/components/leave-request-form";

export default async function ManagerSelfLeavePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  const leaves = await prisma.leaveRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">My leave</h1>
        <p className="text-stone-600">
          Submit holiday or sick leave for yourself. Approval is Admin-only — you cannot sign your own request.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Request leave</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaveRequestForm leaves={leaves} />
        </CardContent>
      </Card>
    </div>
  );
}
