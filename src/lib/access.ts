import { prisma } from "@/lib/prisma";
import { requireUser } from "@/auth";
import { REASON_MIN } from "@/lib/access-constants";

export { REASON_MIN };

const EMPLOYEE_SCOPE = { role: "EMPLOYEE" as const, isActive: true };

export async function requireManager() {
  const session = await requireUser();
  if (session.user.role !== "MANAGER") {
    throw new Error("Unauthorized");
  }
  return session;
}

/** Security boundary: managers may only act on regular EMPLOYEE records — never ADMIN or other managers. */
export async function assertEmployeeTarget(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "EMPLOYEE") {
    throw new Error("Managers can only manage regular employees.");
  }
  return user;
}

export function parseReasonNote(value: unknown) {
  const note = String(value ?? "").trim();
  if (note.length < REASON_MIN) {
    throw new Error(`A reason note of at least ${REASON_MIN} characters is required.`);
  }
  return note;
}

export async function writeManagerAudit(input: {
  managerId: string;
  targetUserId: string;
  actionType: string;
  description: string;
  reasonNote: string;
}) {
  return prisma.auditLog.create({
    data: {
      managerId: input.managerId,
      targetUserId: input.targetUserId,
      actionType: input.actionType,
      description: input.description,
      reasonNote: input.reasonNote,
      isReadByAdmin: false,
    },
  });
}

export function employeeWhere() {
  return EMPLOYEE_SCOPE;
}
