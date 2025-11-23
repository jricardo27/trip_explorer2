import dotenv from "dotenv"
import { Pool } from "pg"

dotenv.config()

export const pool = new Pool({
  user: process.env.POSTGRES_USER || "postgres",
  host: process.env.POSTGRES_HOST || "postgres",
  database: process.env.POSTGRES_DB || "trip_explorer",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const query = (text: string, params?: unknown[]) => pool.query(text, params as any[])
