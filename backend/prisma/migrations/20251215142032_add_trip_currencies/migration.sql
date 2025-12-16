-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "currencies" TEXT[] DEFAULT ARRAY['AUD']::TEXT[];
