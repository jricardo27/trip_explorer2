-- CreateTable
CREATE TABLE "trip_animations" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_animations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_animation_steps" (
    "id" TEXT NOT NULL,
    "animation_id" TEXT NOT NULL,
    "activity_id" TEXT,
    "order_index" INTEGER NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "custom_label" TEXT,
    "zoom_level" INTEGER,
    "transport_mode" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "trip_animation_steps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "trip_animations" ADD CONSTRAINT "trip_animations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_animation_steps" ADD CONSTRAINT "trip_animation_steps_animation_id_fkey" FOREIGN KEY ("animation_id") REFERENCES "trip_animations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_animation_steps" ADD CONSTRAINT "trip_animation_steps_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
