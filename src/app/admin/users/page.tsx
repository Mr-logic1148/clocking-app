import { prisma } from "@/lib/prisma";
import { ActionForm } from "@/components/action-form";
import { setStaffRole } from "@/app/admin/governance-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminUsersPage() {
  const people = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Role management</h1>
        <p className="text-stone-600">
          Only Admins can promote or demote Managers. Multiple managers are allowed. Admin accounts stay locked.
        </p>
      </div>
      <div className="space-y-3">
        {people.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <Badge>{p.role}</Badge>
                  <Badge tone={p.isActive ? "green" : "rose"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-sm text-stone-500">{p.email}</p>
              </div>
              {p.role === "ADMIN" ? (
                <p className="text-sm text-stone-500">Admin privileges cannot be changed here.</p>
              ) : (
                <ActionForm action={setStaffRole} className="flex items-center gap-2" success="Role updated">
                  <input type="hidden" name="id" value={p.id} />
                  <select
                    name="role"
                    defaultValue={p.role}
                    className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="MANAGER">MANAGER</option>
                  </select>
                  <Button type="submit">Save role</Button>
                </ActionForm>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
