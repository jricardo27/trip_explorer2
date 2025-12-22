-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" CHAR(2) NOT NULL,
    "code3" CHAR(3),
    "continent" TEXT,
    "region" TEXT,
    "boundary" JSONB NOT NULL,
    "centroid" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "adminLevel" TEXT,
    "population" INTEGER,
    "boundary" JSONB,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_travel_stats" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_trips" INTEGER NOT NULL DEFAULT 0,
    "total_activities" INTEGER NOT NULL DEFAULT 0,
    "total_countries" INTEGER NOT NULL DEFAULT 0,
    "total_cities" INTEGER NOT NULL DEFAULT 0,
    "first_trip_date" TIMESTAMP(3),
    "last_trip_date" TIMESTAMP(3),
    "last_recalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_travel_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_country_visits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "activity_count" INTEGER NOT NULL DEFAULT 0,
    "first_visit" TIMESTAMP(3) NOT NULL,
    "last_visit" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_country_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_city_visits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "activity_count" INTEGER NOT NULL DEFAULT 0,
    "first_visit" TIMESTAMP(3) NOT NULL,
    "last_visit" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_city_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code3_key" ON "countries"("code3");

-- CreateIndex
CREATE INDEX "cities_country_id_idx" ON "cities"("country_id");

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_countryCode_key" ON "cities"("name", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "user_travel_stats_user_id_key" ON "user_travel_stats"("user_id");

-- CreateIndex
CREATE INDEX "user_country_visits_user_id_idx" ON "user_country_visits"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_country_visits_user_id_country_id_key" ON "user_country_visits"("user_id", "country_id");

-- CreateIndex
CREATE INDEX "user_city_visits_user_id_idx" ON "user_city_visits"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_city_visits_user_id_city_id_key" ON "user_city_visits"("user_id", "city_id");

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_travel_stats" ADD CONSTRAINT "user_travel_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_country_visits" ADD CONSTRAINT "user_country_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_country_visits" ADD CONSTRAINT "user_country_visits_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_city_visits" ADD CONSTRAINT "user_city_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_city_visits" ADD CONSTRAINT "user_city_visits_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
