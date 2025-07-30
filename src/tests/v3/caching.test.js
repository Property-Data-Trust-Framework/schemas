const {
  getSubschema,
  getSubschemaValidator,
  getCacheStats,
  clearSchemaCache,
  isPathValid,
} = require("../../../index");

describe("Schema Caching System", () => {
  const schemaId = "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";
  const testPath = "/propertyPack/surveys";
  const overlays = ["baspiV5", "ta6ed4"];

  beforeEach(() => {
    clearSchemaCache();
  });

  describe("Cache Hit/Miss Behavior", () => {
    test("should start with empty cache", () => {
      const stats = getCacheStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.cacheKeys).toEqual([]);
    });

    test("should cache subschema on first call", () => {
      // First call should populate cache
      const schema1 = getSubschema(testPath, schemaId, overlays);
      
      const stats = getCacheStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.cacheKeys).toHaveLength(1);
      expect(stats.cacheKeys[0]).toContain(testPath);
      expect(stats.cacheKeys[0]).toContain("baspiV5.ta6ed4");
      
      // Second call should return cached version
      const schema2 = getSubschema(testPath, schemaId, overlays);
      
      // Same object reference indicates cache hit
      expect(schema1).toBe(schema2);
      
      // Cache size shouldn't change
      const stats2 = getCacheStats();
      expect(stats2.totalEntries).toBe(1);
    });

    test("should cache validator on first call", () => {
      // First call should populate cache
      const validator1 = getSubschemaValidator(testPath, schemaId, overlays);
      
      const stats = getCacheStats();
      expect(stats.totalEntries).toBe(1);
      
      // Second call should return cached version
      const validator2 = getSubschemaValidator(testPath, schemaId, overlays);
      
      // Same object reference indicates cache hit
      expect(validator1).toBe(validator2);
      
      // Cache size shouldn't change
      const stats2 = getCacheStats();
      expect(stats2.totalEntries).toBe(1);
    });

    test("should create separate cache entries for different paths", () => {
      const path1 = "/participants";
      const path2 = "/propertyPack/surveys";
      const path3 = "/status";
      
      getSubschema(path1, schemaId, overlays);
      getSubschema(path2, schemaId, overlays);
      getSubschema(path3, schemaId, overlays);
      
      const stats = getCacheStats();
      expect(stats.totalEntries).toBe(3);
      expect(stats.cacheKeys.some(key => key.includes(path1))).toBe(true);
      expect(stats.cacheKeys.some(key => key.includes(path2))).toBe(true);
      expect(stats.cacheKeys.some(key => key.includes(path3))).toBe(true);
    });

    test("should create separate cache entries for different overlays", () => {
      const overlays1 = ["baspiV5"];
      const overlays2 = ["ta6ed4"];
      const overlays3 = ["baspiV5", "ta6ed4"];
      
      getSubschema(testPath, schemaId, overlays1);
      getSubschema(testPath, schemaId, overlays2);
      getSubschema(testPath, schemaId, overlays3);
      
      const stats = getCacheStats();
      expect(stats.totalEntries).toBe(3);
      expect(stats.cacheKeys.some(key => key.includes("baspiV5"))).toBe(true);
      expect(stats.cacheKeys.some(key => key.includes("ta6ed4"))).toBe(true);
      expect(stats.cacheKeys.some(key => key.includes("baspiV5.ta6ed4"))).toBe(true);
    });

    test("should handle null/empty overlays consistently", () => {
      getSubschema(testPath, schemaId, null);
      getSubschema(testPath, schemaId, []);
      getSubschema(testPath, schemaId, undefined);
      
      const stats = getCacheStats();
      // Should create separate entries for each null-equivalent
      expect(stats.totalEntries).toBeGreaterThan(0);
    });
  });

  describe("Cache Management Functions", () => {
    test("getCacheStats should return accurate information", () => {
      // Start with empty cache
      let stats = getCacheStats();
      expect(stats).toHaveProperty("totalEntries");
      expect(stats).toHaveProperty("cacheKeys");
      expect(stats.totalEntries).toBe(0);
      expect(Array.isArray(stats.cacheKeys)).toBe(true);
      
      // Add some entries
      getSubschema("/property", schemaId, ["baspiV5"]);
      getSubschema("/property/propertyPack", schemaId, ["ta6ed4"]);
      
      stats = getCacheStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.cacheKeys).toHaveLength(2);
    });

    test("clearSchemaCache should empty the cache", () => {
      // Populate cache
      getSubschema(testPath, schemaId, overlays);
      getSubschemaValidator(testPath, schemaId, overlays);
      
      let stats = getCacheStats();
      expect(stats.totalEntries).toBe(1);
      
      // Clear cache
      clearSchemaCache();
      
      stats = getCacheStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.cacheKeys).toEqual([]);
    });

    test("should rebuild cache after clearing", () => {
      // Populate cache
      const schema1 = getSubschema(testPath, schemaId, overlays);
      
      // Clear cache
      clearSchemaCache();
      
      // Get schema again - should recompute
      const schema2 = getSubschema(testPath, schemaId, overlays);
      
      // Should be equivalent content
      expect(schema1).toEqual(schema2);
      // Note: The actual schema content may be the same object due to how schemas are stored,
      // but cache entry should be recreated
      
      const stats = getCacheStats();
      expect(stats.totalEntries).toBe(1);
    });
  });

  describe("Schema Identity and Validator Consistency", () => {
    test("cached schemas should be identical objects", () => {
      const schema1 = getSubschema(testPath, schemaId, overlays);
      const schema2 = getSubschema(testPath, schemaId, overlays);
      const schema3 = getSubschema(testPath, schemaId, overlays);
      
      expect(schema1).toBe(schema2);
      expect(schema2).toBe(schema3);
      expect(schema1).toBe(schema3);
    });

    test("cached validators should be identical objects", () => {
      const validator1 = getSubschemaValidator(testPath, schemaId, overlays);
      const validator2 = getSubschemaValidator(testPath, schemaId, overlays);
      const validator3 = getSubschemaValidator(testPath, schemaId, overlays);
      
      expect(validator1).toBe(validator2);
      expect(validator2).toBe(validator3);
      expect(validator1).toBe(validator3);
    });

    test("mixed calls should use same cached data", () => {
      // First get schema
      const schema = getSubschema(testPath, schemaId, overlays);
      
      // Then get validator - should use same cache entry
      const validator = getSubschemaValidator(testPath, schemaId, overlays);
      
      // Then get schema again
      const schema2 = getSubschema(testPath, schemaId, overlays);
      
      expect(schema).toBe(schema2);
      expect(typeof validator).toBe("function");
      
      // Should still be only one cache entry
      const stats = getCacheStats();
      expect(stats.totalEntries).toBe(1);
    });

    test("validators should work correctly with cached schemas", () => {
      // Use a path that exists - status
      const validator = getSubschemaValidator("/status", schemaId, overlays);
      
      // Test that the validator is a function
      expect(typeof validator).toBe("function");
      
      // Test with a valid status value
      const result = validator("active");
      
      // The validator should exist and be callable
      expect(typeof result).toBe("boolean");
    });
  });

  describe("Integration with Existing Functions", () => {
    test("isPathValid should work with cached schemas", () => {
      // Use a path that definitely exists
      const validPath = "/participants";
      
      // First call will populate cache
      const isValid1 = isPathValid(validPath, schemaId, overlays);
      
      // Second call should use cache
      const isValid2 = isPathValid(validPath, schemaId, overlays);
      
      expect(isValid1).toBe(isValid2);
      expect(isValid1).toBe(true);
      
      // Should have cached entry
      const stats = getCacheStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    test("should handle invalid paths gracefully", () => {
      const invalidPath = "/nonexistent/path/here";
      
      const schema = getSubschema(invalidPath, schemaId, overlays);
      const validator = getSubschemaValidator(invalidPath, schemaId, overlays);
      const isValid = isPathValid(invalidPath, schemaId, overlays);
      
      expect(schema).toBeUndefined();
      expect(typeof validator).toBe("function");
      expect(isValid).toBe(false);
      
      // Should still cache the result
      const stats = getCacheStats();
      expect(stats.totalEntries).toBe(1);
    });
  });

  describe("Performance Characteristics", () => {
    test("should demonstrate significant speedup on cached calls", () => {
      const iterations = 10;
      
      // First call (cold cache)
      const start1 = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        clearSchemaCache();
        getSubschema(testPath, schemaId, overlays);
      }
      const end1 = process.hrtime.bigint();
      const coldTime = Number(end1 - start1) / 1_000_000; // Convert to milliseconds
      
      // Warm up cache
      getSubschema(testPath, schemaId, overlays);
      
      // Subsequent calls (warm cache)
      const start2 = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        getSubschema(testPath, schemaId, overlays);
      }
      const end2 = process.hrtime.bigint();
      const warmTime = Number(end2 - start2) / 1_000_000; // Convert to milliseconds
      
      // Warm cache should be significantly faster
      expect(warmTime).toBeLessThan(coldTime / 10); // At least 10x faster
    });

    test("cache should scale well with multiple entries", () => {
      const paths = [
        "/participants",
        "/status", 
        "/propertyPack/surveys",
        "/propertyPack/valuations",
      ];
      
      const overlaySet = [
        ["baspiV5"],
        ["ta6ed4"],
        ["baspiV5", "ta6ed4"],
      ];
      
      // Populate cache with multiple combinations
      paths.forEach(path => {
        overlaySet.forEach(overlays => {
          getSubschema(path, schemaId, overlays);
        });
      });
      
      const stats = getCacheStats();
      expect(stats.totalEntries).toBe(paths.length * overlaySet.length);
      
      // All subsequent calls should be fast
      const start = process.hrtime.bigint();
      paths.forEach(path => {
        overlaySet.forEach(overlays => {
          getSubschema(path, schemaId, overlays);
        });
      });
      const end = process.hrtime.bigint();
      const timeMs = Number(end - start) / 1_000_000;
      
      // Should be very fast (less than 1ms total for all cached calls)
      expect(timeMs).toBeLessThan(1);
    });
  });
});