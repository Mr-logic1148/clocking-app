import { LiveBoard } from "@/components/live-board";

export default function ManagerDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Floor roster</h1>
        <p className="text-stone-600">
          Live presence for regular employees only. Admin staff never appear here.
        </p>
      </div>
      <LiveBoard endpoint="/api/manager/live" />
    </div>
  );
}
