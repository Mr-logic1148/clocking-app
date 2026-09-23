-- Recreate LeaveType with expanded values and migrate existing rows
CREATE TYPE "LeaveType_new" AS ENUM ('PAID_HOLIDAY', 'SICK_LEAVE', 'MATERNITY_LEAVE', 'PATERNITY_LEAVE', 'UNPAID_LEAVE');

ALTER TABLE "LeaveRequest" ALTER COLUMN "type" TYPE "LeaveType_new" USING (
  CASE "type"::text
    WHEN 'HOLIDAY' THEN 'PAID_HOLIDAY'
    WHEN 'SICK' THEN 'SICK_LEAVE'
    ELSE 'UNPAID_LEAVE'
  END::"LeaveType_new"
);

ALTER TYPE "LeaveType" RENAME TO "LeaveType_old";
ALTER TYPE "LeaveType_new" RENAME TO "LeaveType";
DROP TYPE "LeaveType_old";

-- Shift station / recurrence
ALTER TABLE "ShiftAssignment" ADD COLUMN "station" TEXT;
ALTER TABLE "ShiftAssignment" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;
UPDATE "ShiftAssignment" SET "station" = "label" WHERE "station" IS NULL AND "label" IS NOT NULL;

CREATE INDEX "ShiftAssignment_startsAt_endsAt_idx" ON "ShiftAssignment"("startsAt", "endsAt");
CREATE INDEX "ShiftAssignment_userId_idx" ON "ShiftAssignment"("userId");

-- Recurring weekly templates
CREATE TABLE "ShiftTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "station" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "weekdays" INTEGER[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShiftTemplate_createdById_idx" ON "ShiftTemplate"("createdById");

ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
