import { QueryResult } from "pg"
import request from "supertest"
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the db module BEFORE importing index (which imports db)
vi.mock("./db", () => ({
  query: vi.fn(),
}))

import { query } from "./db"

import { app } from "./index"

describe("API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/markers", () => {
    it("should return 400 if path is missing", async () => {
      const res = await request(app).get("/api/markers")
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ error: "Path query parameter is required" })
    })

    it("should return markers if found", async () => {
      const mockData = { type: "FeatureCollection", features: [] }
      vi.mocked(query).mockResolvedValue({ rows: [{ data: mockData }] } as unknown as QueryResult)

      const res = await request(app).get("/api/markers?path=test")
      expect(res.status).toBe(200)
      expect(res.body).toEqual(mockData)
      expect(query).toHaveBeenCalledWith("SELECT data FROM markers WHERE path = $1", ["test"])
    })

    it("should return 404 if markers not found", async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] } as unknown as QueryResult)

      const res = await request(app).get("/api/markers?path=test")
      expect(res.status).toBe(404)
    })
  })

  describe("GET /api/features", () => {
    it("should return 400 if user_id is missing", async () => {
      const res = await request(app).get("/api/features")
      expect(res.status).toBe(400)
    })

    it("should return grouped features", async () => {
      const mockRows = [
        { list_name: "List1", feature: { id: 1 } },
        { list_name: "List1", feature: { id: 2 } },
        { list_name: "List2", feature: { id: 3 } },
      ]
      vi.mocked(query).mockResolvedValue({ rows: mockRows } as unknown as QueryResult)

      const res = await request(app).get("/api/features?user_id=user1")
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        List1: [{ id: 1 }, { id: 2 }],
        List2: [{ id: 3 }],
      })
    })
  })

  describe("POST /api/features", () => {
    it("should save a feature", async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] } as unknown as QueryResult)

      const res = await request(app).post("/api/features").send({ user_id: "u1", list_name: "l1", feature: {} })

      expect(res.status).toBe(201)
      expect(query).toHaveBeenCalled()
    })
  })
})
