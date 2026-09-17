import { prisma } from "@/lib/prisma";
import { ActionForm, createEmployee, deactivateEmployee, updateEmployee } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function EmployeesPage() {
  const people = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">People</h1>
        <p className="text-stone-600">Create staff, reset PINs, set pay rates, deactivate leavers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add employee</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createEmployee} success="Employee created" className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input name="name" required />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input name="email" type="email" required />
            </div>
            <div className="space-y-1">
              <Label>Kiosk PIN (4–6 digits)</Label>
              <Input name="pin" inputMode="numeric" pattern="\d{4,6}" />
            </div>
            <div className="space-y-1">
              <Label>Temporary password</Label>
              <Input name="password" placeholder="Employee123!" />
            </div>
            <div className="space-y-1">
              <Label>Hourly rate</Label>
              <Input name="hourlyRate" type="number" step="0.01" />
            </div>
            <div className="flex items-end">
              <Button type="submit">Create</Button>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {people.map((p) => (
          <Card key={p.id}>
            <CardContent className="pt-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <Badge>{p.role}</Badge>
                <Badge tone={p.isActive ? "green" : "rose"}>{p.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <ActionForm action={updateEmployee} className="grid gap-3 md:grid-cols-3">
                <input type="hidden" name="id" value={p.id} />
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input name="name" defaultValue={p.name} />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input name="email" defaultValue={p.email} />
                </div>
                <div className="space-y-1">
                  <Label>Reset PIN</Label>
                  <Input name="pin" placeholder="Leave blank to keep" />
                </div>
                <div className="space-y-1">
                  <Label>Hourly rate</Label>
                  <Input
                    name="hourlyRate"
                    type="number"
                    step="0.01"
                    defaultValue={p.hourlyRate ? Number(p.hourlyRate) : ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Active</Label>
                  <select
                    name="isActive"
                    defaultValue={p.isActive ? "true" : "false"}
                    className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit">Save</Button>
                </div>
              </ActionForm>
              {p.role !== "ADMIN" && (
                <form
                  className="mt-3"
                  action={async () => {
                    "use server";
                    await deactivateEmployee(p.id);
                  }}
                >
                  <Button type="submit" variant="outline" size="sm">
                    Deactivate & clear PIN
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
