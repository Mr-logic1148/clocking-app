import { LiveBoard } from "@/components/live-board";

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Live attendance</h1>
        <p className="text-stone-600">Who is on the floor, on break, or off shift.</p>
      </div>
      <LiveBoard />
    </div>
  );
}
