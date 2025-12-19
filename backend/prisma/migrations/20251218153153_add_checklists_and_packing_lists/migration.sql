-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_checklist_items" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packing_list_templates" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packing_list_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_packing_items" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "is_packed" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_packing_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "trip_checklist_items" ADD CONSTRAINT "trip_checklist_items_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_packing_items" ADD CONSTRAINT "trip_packing_items_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
