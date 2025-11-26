import { describe, it, expect } from "vitest"

import { GeoJsonFeature } from "../../data/types"

import { filterFeatures } from "./filterFeatures"

// Mock GeoJsonFeature objects
const mockFeatures: GeoJsonFeature[] = [
  {
    type: "Feature",
    properties: { name: "Alpha Park", description: "A beautiful park with many trees" },
    geometry: { type: "Point", coordinates: [0, 0] },
    id: "1",
  },
  {
    type: "Feature",
    properties: { name: "Beta Garden", description: "A lovely garden full of flowers" },
    geometry: { type: "Polygon", coordinates: [[[0, 0]]] },
    id: "2",
  },
  {
    type: "Feature",
    properties: { name: "Gamma Point", description: "A scenic spot with alpha views" },
    geometry: { type: "LineString", coordinates: [[0, 0]] },
    id: "3",
  },
  {
    type: "Feature",
    properties: { name: "Delta Place" }, // Missing description (undefined)
    geometry: { type: "Point", coordinates: [1, 1] },
    id: "4",
  },
  {
    type: "Feature",
    properties: { description: "Epsilon Area with unique plants" }, // Missing name (undefined)
    geometry: { type: "Point", coordinates: [2, 2] },
    id: "5",
  },
  {
    type: "Feature",
    properties: {}, // Missing both name and description (undefined)
    geometry: { type: "Point", coordinates: [3, 3] },
    id: "6",
  },
  {
    type: "Feature",
    properties: { name: "zeta spot", description: "another lovely spot" }, // lowercase name for case-insensitivity test
    geometry: { type: "Point", coordinates: [4, 4] },
    id: "7",
  },
  {
    type: "Feature",
    properties: { name: null, description: "Eta Location with null name" },
    geometry: { type: "Point", coordinates: [5, 5] },
    id: "8",
  },
  {
    type: "Feature",
    properties: { name: "Theta Landmark", description: null },
    geometry: { type: "Point", coordinates: [6, 6] },
    id: "9",
  },
  {
    type: "Feature",
    properties: { name: null, description: null },
    geometry: { type: "Point", coordinates: [7, 7] },
    id: "10",
  },
]

// Transform mockFeatures to the new input structure for the filterFeatures function
const mockItems: Array<{ feature: GeoJsonFeature; originalIndex: number }> = mockFeatures.map((feature, index) => ({
  feature,
  originalIndex: index,
}))

describe("filterFeatures", () => {
  it("should return all items if search query is empty", () => {
    expect(filterFeatures(mockItems, "")).toEqual(mockItems)
  })

  it("should filter by name (exact match)", () => {
    const result = filterFeatures(mockItems, "Alpha Park")
    expect(result).toHaveLength(1)
    // Add '!' after properties to assert it's not null
    expect(result[0].feature.properties!.name).toBe("Alpha Park")
    expect(result[0].originalIndex).toBe(0)
  })

  it("should filter by name (partial match)", () => {
    const result = filterFeatures(mockItems, "Park")
    expect(result).toHaveLength(1)
    expect(result[0].feature.properties!.name).toBe("Alpha Park")
  })

  it("should filter by name (case-insensitive)", () => {
    const result = filterFeatures(mockItems, "alpha park")
    expect(result).toHaveLength(1)
    expect(result[0].feature.properties!.name).toBe("Alpha Park")
  })

  it("should filter by description (exact match)", () => {
    const result = filterFeatures(mockItems, "A lovely garden full of flowers")
    expect(result).toHaveLength(1)
    expect(result[0].feature.properties!.description).toBe("A lovely garden full of flowers")
  })

  it("should filter by description (partial match)", () => {
    const result = filterFeatures(mockItems, "lovely")
    expect(result).toHaveLength(2) // "Beta Garden" and "zeta spot"
    expect(result.some((item) => item.feature.properties!.name === "Beta Garden")).toBe(true)
    expect(result.some((item) => item.feature.properties!.name === "zeta spot")).toBe(true)
  })

  it("should filter by description (case-insensitive)", () => {
    const result = filterFeatures(mockItems, "a lovely garden")
    expect(result).toHaveLength(1)
    expect(result[0].feature.properties!.name).toBe("Beta Garden")
  })

  it('should filter by query matching part of description ("alpha views")', () => {
    const result = filterFeatures(mockItems, "alpha views")
    expect(result).toHaveLength(1)
    expect(result[0].feature.properties!.name).toBe("Gamma Point")
  })

  it('should filter by query matching part of name ("Gam")', () => {
    const result = filterFeatures(mockItems, "Gam")
    expect(result).toHaveLength(1)
    expect(result[0].feature.properties!.name).toBe("Gamma Point")
  })

  it("should return an empty array if no items match the search query", () => {
    const result = filterFeatures(mockItems, "NonExistentPlace")
    expect(result).toHaveLength(0)
  })

  it("should handle items with missing description property (undefined) in their feature", () => {
    const result = filterFeatures(mockItems, "Delta Place")
    expect(result).toHaveLength(1)
    expect(result[0].feature.properties!.name).toBe("Delta Place")
  })

  it("should handle items with missing name property (undefined) in their feature", () => {
    const result = filterFeatures(mockItems, "Epsilon Area")
    expect(result).toHaveLength(1)
    expect(result[0].feature.properties!.description).toBe("Epsilon Area with unique plants")
  })

  it("should include items if feature name matches, even if description is missing (undefined)", () => {
    const result = filterFeatures(mockItems, "Delta")
    expect(result).toHaveLength(1)
    expect(result[0].feature.id).toBe("4")
  })

  it("should include items if feature description matches, even if name is missing (undefined)", () => {
    const result = filterFeatures(mockItems, "Epsilon")
    expect(result).toHaveLength(1)
    expect(result[0].feature.id).toBe("5")
  })

  it("should not crash and correctly exclude items whose features have no name or description (undefined) when searching", () => {
    const result = filterFeatures(mockItems, "MissingBoth")
    expect(result).toHaveLength(0)
  })

  it("should not include items with missing name and description (undefined) in their feature if search query is non-empty", () => {
    // Feature with id "6" has no name or description
    let result = filterFeatures(mockItems, "Alpha")
    expect(result.some((item) => item.feature.id === "6")).toBe(false)

    result = filterFeatures(mockItems, "Anything")
    expect(result.some((item) => item.feature.id === "6")).toBe(false)
  })

  it('should correctly perform case-insensitive search for names like "zeta spot"', () => {
    const result = filterFeatures(mockItems, "zeta")
    expect(result).toHaveLength(1)
    expect(result[0].feature.properties!.name).toBe("zeta spot")

    const resultCaps = filterFeatures(mockItems, "ZETA")
    expect(resultCaps).toHaveLength(1)
    expect(resultCaps[0].feature.properties!.name).toBe("zeta spot")
  })

  it("should return items whose features match either name or description", () => {
    // "alpha" is in "Alpha Park" name and "Gamma Point" description
    const result = filterFeatures(mockItems, "alpha")
    expect(result).toHaveLength(2)
    expect(result.some((item) => item.feature.properties!.name === "Alpha Park")).toBe(true)
    expect(result.some((item) => item.feature.properties!.name === "Gamma Point")).toBe(true)
  })

  it("should preserve originalIndex for filtered items", () => {
    const result = filterFeatures(mockItems, "Beta")
    expect(result).toHaveLength(1)
    expect(result[0].feature.properties!.name).toBe("Beta Garden")
    expect(result[0].originalIndex).toBe(1)

    const resultMultiple = filterFeatures(mockItems, "spot") // Gamma Point (idx 2), zeta spot (idx 6)
    expect(resultMultiple).toHaveLength(2)
    expect(resultMultiple.find((item) => item.feature.id === "3")?.originalIndex).toBe(2)
    expect(resultMultiple.find((item) => item.feature.id === "7")?.originalIndex).toBe(6)
  })

  it("should filter by description if name is null", () => {
    const result = filterFeatures(mockItems, "Eta Location")
    expect(result).toHaveLength(1)
    expect(result[0].feature.id).toBe("8")
    expect(result[0].feature.properties!.description).toBe("Eta Location with null name")
  })

  it("should filter by name if description is null", () => {
    const result = filterFeatures(mockItems, "Theta Landmark")
    expect(result).toHaveLength(1)
    expect(result[0].feature.id).toBe("9")
    expect(result[0].feature.properties!.name).toBe("Theta Landmark")
  })

  it("should not find a match if searching for a term that would match a null name", () => {
    // Assuming "Eta" would match if name wasn't null
    const result = filterFeatures(mockItems, "Eta")
    // It should only find "Eta Location with null name" via description
    expect(result.filter((item) => item.feature.id === "8")).toHaveLength(1)
    expect(
      result.every(
        (item) =>
          item.feature.properties!.name !== null || item.feature.properties!.description?.toLowerCase().includes("eta"),
      ),
    ).toBe(true)
  })

  it("should not find a match if searching for a term that would match a null description", () => {
    // Assuming "Theta" would match if description wasn't null
    const result = filterFeatures(mockItems, "Theta")
    // It should only find "Theta Landmark" via name
    expect(result.filter((item) => item.feature.id === "9")).toHaveLength(1)
    expect(
      result.every(
        (item) =>
          item.feature.properties!.description !== null ||
          item.feature.properties!.name?.toLowerCase().includes("theta"),
      ),
    ).toBe(true)
  })

  it("should not include items where both name and description are null when searching", () => {
    const result = filterFeatures(mockItems, "AnySearchTerm")
    expect(result.some((item) => item.feature.id === "10")).toBe(false)
  })

  it("should not crash if properties object is null (though filterFeatures handles this by returning false)", () => {
    const itemsWithNullProps = [
      ...mockItems,
      {
        feature: {
          type: "Feature",
          properties: null, // Explicitly null properties
          geometry: { type: "Point", coordinates: [8, 8] },
          id: "11",
        } as GeoJsonFeature,
        originalIndex: mockItems.length,
      },
    ]
    const result = filterFeatures(itemsWithNullProps, "test")
    expect(result.some((item) => item.feature.id === "11")).toBe(false)
    // No crash is the main assertion here, length check is secondary
    expect(result.length).toBeLessThan(itemsWithNullProps.length)
  })
})
