-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "checklist_categories" TEXT[] DEFAULT ARRAY['General', 'Preparation', 'Booking', 'Packing']::TEXT[],
ADD COLUMN     "packing_categories" TEXT[] DEFAULT ARRAY['Clothing', 'Electronics', 'Toiletries', 'Gear', 'Misc']::TEXT[];

-- CreateTable
CREATE TABLE "trip_documents" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "notes" TEXT,
    "category" TEXT DEFAULT 'General',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "trip_documents" ADD CONSTRAINT "trip_documents_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
