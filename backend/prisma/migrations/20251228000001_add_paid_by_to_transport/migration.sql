-- AlterTable
ALTER TABLE "transport_alternatives" ADD COLUMN "paid_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "transport_alternatives"
ADD CONSTRAINT "transport_alternatives_paid_by_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "trip_members" ("id") ON DELETE SET NULL ON UPDATE CASCADE;