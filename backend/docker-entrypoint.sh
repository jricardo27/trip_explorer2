#!/bin/sh

echo "Waiting for postgres to be ready..."
until nc -z postgres 5432; do
  sleep 1
done

echo "Running unique constraint migration..."
npm run migrate:unique

echo "Running marker data migration..."
npm run migrate:markers
npm run migrate:cities
MIGRATION_EXIT_CODE=$?

if [ $MIGRATION_EXIT_CODE -ne 0 ]; then
  echo "Warning: Migration completed with warnings or errors (exit code: $MIGRATION_EXIT_CODE)"
  echo "Continuing to start server..."
fi

echo "Running transport columns migration..."
npm run migrate:transport

echo "Running unified columns migration..."
npm run migrate:unified

echo "Starting server..."
exec npm run dev
