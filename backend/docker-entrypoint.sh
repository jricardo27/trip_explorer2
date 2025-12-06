#!/bin/sh

echo "Waiting for postgres to be ready..."
until nc -z postgres 5432; do
  sleep 1
done

echo "Generating Prisma client..."
npx prisma generate

echo "Running database migrations..."
npm run migrate

MIGRATION_EXIT_CODE=$?

if [ $MIGRATION_EXIT_CODE -ne 0 ]; then
  echo "Warning: Migration completed with warnings or errors (exit code: $MIGRATION_EXIT_CODE)"
  echo "Continuing to start server..."
fi

echo "Starting server..."
exec npm run dev

