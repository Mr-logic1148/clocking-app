import { prisma } from "@/lib/prisma";
import { markAllAuditsRead, markAuditRead } from "@/app/admin/governance-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ manager?: string; type?: string; from?: string; unread?: string }>;
}) {
  const params = await searchParams;
  const where = {
    ...(params.unread === "1" ? { isReadByAdmin: false } : {}),
    ...(params.manager ? { managerId: params.manager } : {}),
    ...(params.type ? { actionType: params.type } : {}),
    ...(params.from ? { createdAt: { gte: new Date(params.from) } } : {}),
  };

  const [logs, managers, types, unread] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { manager: true, targetUser: true },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.user.findMany({ where: { role: "MANAGER" }, orderBy: { name: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["actionType"], select: { actionType: true } }),
    prisma.auditLog.count({ where: { isReadByAdmin: false } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Compliance audit</h1>
          <p className="text-stone-600">
            Every manager override lands here unread until an Admin reviews it.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await markAllAuditsRead();
          }}
        >
          <Button type="submit" variant="outline">
            Mark all read ({unread})
          </Button>
        </form>
      </div>

      <form className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 md:grid-cols-4">
        <select name="manager" defaultValue={params.manager ?? ""} className="h-11 rounded-xl border px-3 text-sm">
          <option value="">All managers</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={params.type ?? ""} className="h-11 rounded-xl border px-3 text-sm">
          <option value="">All actions</option>
          {types.map((t) => (
            <option key={t.actionType} value={t.actionType}>
              {t.actionType}
            </option>
          ))}
        </select>
        <Input type="date" name="from" defaultValue={params.from ?? ""} />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="unread" value="1" defaultChecked={params.unread === "1"} />
            Unread only
          </label>
          <Button type="submit" size="sm">
            Filter
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        {logs.length === 0 && <p className="text-sm text-stone-500">No manager actions match these filters.</p>}
        {logs.map((log) => (
          <article key={log.id} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={log.isReadByAdmin ? "neutral" : "rose"}>
                {log.isReadByAdmin ? "Read" : "Unread"}
              </Badge>
              <Badge>{log.actionType}</Badge>
              <span className="text-xs text-stone-500">{log.createdAt.toLocaleString()}</span>
            </div>
            <p className="mt-2 font-medium">{log.description}</p>
            <p className="mt-1 text-sm text-stone-600">
              Manager: {log.manager.name} · Target: {log.targetUser.name}
            </p>
            <p className="mt-2 rounded-xl bg-stone-50 p-3 text-sm">
              <span className="font-semibold">Note: </span>
              {log.reasonNote}
            </p>
            {!log.isReadByAdmin && (
              <form
                className="mt-3"
                action={async () => {
                  "use server";
                  await markAuditRead(log.id);
                }}
              >
                <Button size="sm" variant="outline" type="submit">
                  Mark reviewed
                </Button>
              </form>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
