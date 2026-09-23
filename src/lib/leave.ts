export const LEAVE_TYPES = [
  { value: "PAID_HOLIDAY", label: "Paid holiday" },
  { value: "SICK_LEAVE", label: "Sick leave" },
  { value: "MATERNITY_LEAVE", label: "Maternity leave" },
  { value: "PATERNITY_LEAVE", label: "Paternity leave" },
  { value: "UNPAID_LEAVE", label: "Unpaid leave" },
] as const;

export type LeaveTypeValue = (typeof LEAVE_TYPES)[number]["value"];

export function isLeaveType(value: string): value is LeaveTypeValue {
  return LEAVE_TYPES.some((t) => t.value === value);
}

export function leaveTypeLabel(value: string) {
  return LEAVE_TYPES.find((t) => t.value === value)?.label ?? value.replaceAll("_", " ").toLowerCase();
}
