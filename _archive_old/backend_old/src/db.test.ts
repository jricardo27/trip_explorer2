import { Pool } from "pg"
import { describe, it, expect, vi } from "vitest"

import { query } from "./db"

// Mock the pg module
vi.mock("pg", () => {
  const mPoolInstance = {
    query: vi.fn(),
  }

  // Define a mock class for Pool
  class MockPool {
    constructor() {
      return mPoolInstance
    }
  }

  return { Pool: MockPool }
})

describe("db module", () => {
  it("should execute query with correct arguments", async () => {
    const mockPool = new Pool()
    const text = "SELECT * FROM users WHERE id = $1"
    const params = [1]

    await query(text, params)

    expect(mockPool.query).toHaveBeenCalledWith(text, params)
  })

  it("should execute query without params", async () => {
    const mockPool = new Pool()
    const text = "SELECT NOW()"

    await query(text)

    expect(mockPool.query).toHaveBeenCalledWith(text, undefined)
  })
})
