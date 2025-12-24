-- CreateTable
CREATE TABLE "day_scenarios" (
    "id" TEXT NOT NULL,
    "trip_day_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "day_scenarios_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "day_scenarios"
ADD CONSTRAINT "day_scenarios_trip_day_id_fkey" FOREIGN KEY ("trip_day_id") REFERENCES "trip_days" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "activities" ADD COLUMN "scenario_id" TEXT;

-- AddForeignKey
ALTER TABLE "activities"
ADD CONSTRAINT "activities_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "day_scenarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data Migration: Create default "Main Plan" scenario for each day and link existing activities
-- This ensures backward compatibility
DO $$
DECLARE
    day_record RECORD;
    new_scenario_id TEXT;
BEGIN
    FOR day_record IN SELECT id FROM trip_days LOOP
        -- Create default scenario for this day
        INSERT INTO day_scenarios (id, trip_day_id, name, is_selected, order_index, created_at, updated_at)
        VALUES (gen_random_uuid(), day_record.id, 'Main Plan', true, 0, NOW(), NOW())
        RETURNING id INTO new_scenario_id;
        
        -- Link all existing activities for this day to the default scenario
        UPDATE activities 
        SET scenario_id = new_scenario_id
        WHERE trip_day_id = day_record.id;
    END LOOP;
END $$;