import { prisma } from "@/lib/prisma";
import { ReasonNoteForm } from "@/components/reason-note-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { managerSendBroadcast } from "@/app/manager/actions";

export default async function ManagerBroadcastsPage() {
  const recent = await prisma.floorBroadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { _count: { select: { receipts: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Emergency floor broadcast</h1>
        <p className="text-stone-600">
          Alert off-duty employees about open shifts. The kiosk shows a live banner; staff also see it in My hours.
        </p>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h2 className="mb-3 text-lg font-semibold">Send floor request</h2>
        <ReasonNoteForm
          action={managerSendBroadcast}
          submitLabel="Compose alert"
          success="Alert sent to off-duty staff"
          extraFields={
            <>
              <div className="mb-3 space-y-1">
                <Label>Message</Label>
                <textarea
                  name="message"
                  required
                  minLength={8}
                  rows={3}
                  placeholder="Need two packers on Line B from 6pm — overtime available."
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="mb-3 space-y-1">
                <Label>Expires in hours</Label>
                <Input name="hours" type="number" min={1} max={24} defaultValue={4} />
              </div>
            </>
          }
        />
      </div>

      <div className="space-y-3">
        {recent.map((b) => (
          <div key={b.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="font-medium">{b.message}</p>
            <p className="text-xs text-stone-500">
              {b.createdAt.toLocaleString()} · {b._count.receipts} off-duty inboxes · expires{" "}
              {b.expiresAt.toLocaleTimeString()} · {b.channel}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
