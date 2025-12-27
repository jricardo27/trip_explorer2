-- AlterTable
ALTER TABLE "activities"
ADD COLUMN "cost_once_for_linked_group" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "paid_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "activities"
ADD CONSTRAINT "activities_paid_by_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "trip_members" ("id") ON DELETE SET NULL ON UPDATE CASCADE;