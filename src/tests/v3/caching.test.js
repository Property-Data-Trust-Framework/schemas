const {
  getSubschema,
  getSubschemaValidator,
  getCacheStats,
  getDetailedCacheStats,
  clearSchemaCache,
  warmupCache,
  pruneCacheByAge,
  setCacheMaxSize,
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

  describe("Enhanced Cache Management", () => {
    beforeEach(() => {
      clearSchemaCache();
    });

    describe("Enhanced Statistics", () => {
      test("should track hit/miss statistics", () => {
        const stats1 = getCacheStats();
        expect(stats1.hits).toBe(0);
        expect(stats1.misses).toBe(0);
        expect(stats1.totalQueries).toBe(0);
        expect(stats1.hitRate).toBe(0);

        // First call should be a miss
        getSubschema(testPath, schemaId, overlays);
        const stats2 = getCacheStats();
        expect(stats2.misses).toBe(1);
        expect(stats2.hits).toBe(0);
        expect(stats2.totalQueries).toBe(1);
        expect(stats2.hitRate).toBe(0);

        // Second call should be a hit
        getSubschema(testPath, schemaId, overlays);
        const stats3 = getCacheStats();
        expect(stats3.misses).toBe(1);
        expect(stats3.hits).toBe(1);
        expect(stats3.totalQueries).toBe(2);
        expect(stats3.hitRate).toBe(50);
      });

      test("should provide detailed cache statistics", () => {
        // Add some entries using safe paths
        getSubschema("/participants", schemaId, []);
        getSubschema("/status", schemaId, []);

        const detailedStats = getDetailedCacheStats();
        
        expect(detailedStats).toHaveProperty("totalEntries");
        expect(detailedStats).toHaveProperty("hits");
        expect(detailedStats).toHaveProperty("misses");
        expect(detailedStats).toHaveProperty("hitRate");
        expect(detailedStats).toHaveProperty("entries");
        expect(detailedStats).toHaveProperty("oldestEntry");
        expect(detailedStats).toHaveProperty("newestEntry");
        
        expect(detailedStats.entries).toHaveLength(2);
        expect(detailedStats.entries[0]).toHaveProperty("key");
        expect(detailedStats.entries[0]).toHaveProperty("createdAt");
        expect(detailedStats.entries[0]).toHaveProperty("age");
        expect(detailedStats.entries[0]).toHaveProperty("hasValidator");
        expect(detailedStats.entries[0]).toHaveProperty("hasSubSchema");
      });

      test("should track memory usage estimates", () => {
        getSubschema(testPath, schemaId, overlays);
        
        const stats = getCacheStats();
        expect(stats.memoryUsage).toHaveProperty("entriesCount");
        expect(stats.memoryUsage).toHaveProperty("estimatedSizeKB");
        expect(stats.memoryUsage.entriesCount).toBe(1);
        expect(typeof stats.memoryUsage.estimatedSizeKB).toBe("number");
      });
    });

    describe("Cache Warming", () => {
      test("should warm cache with default paths and overlays", () => {
        const warmupStats = warmupCache();
        
        expect(warmupStats).toHaveProperty("totalAttempted");
        expect(warmupStats).toHaveProperty("successful");
        expect(warmupStats).toHaveProperty("failed");
        expect(warmupStats).toHaveProperty("errors");
        
        expect(warmupStats.totalAttempted).toBeGreaterThan(0);
        expect(warmupStats.successful).toBeGreaterThan(0);
        expect(warmupStats.totalAttempted).toBe(warmupStats.successful + warmupStats.failed);

        // Cache should now have entries
        const stats = getCacheStats();
        expect(stats.totalEntries).toBeGreaterThan(0);
      });

      test("should warm cache with custom paths and overlays", () => {
        const customPaths = ["/propertyPack", "/participants"];
        const customOverlays = [[], ["baspiV5"]];
        
        const warmupStats = warmupCache(customPaths, schemaId, customOverlays);
        
        expect(warmupStats.totalAttempted).toBe(customPaths.length * customOverlays.length);
        expect(warmupStats.successful).toBeGreaterThan(0);

        const stats = getCacheStats();
        expect(stats.totalEntries).toBe(warmupStats.successful);
      });

      test("should handle invalid paths gracefully during warmup", () => {
        const pathsWithInvalid = ["/participants", "/invalid/path", "/status"];
        const warmupStats = warmupCache(pathsWithInvalid, schemaId, [[]]);
        
        expect(warmupStats.totalAttempted).toBe(3);
        expect(warmupStats.successful).toBe(3); // All paths are processed, even invalid ones
        expect(warmupStats.failed).toBe(0); // Invalid paths still "succeed" but create null schemas
      });
    });

    describe("Selective Cache Clearing", () => {
      test("should clear cache entries by pattern", () => {
        // Populate cache with different patterns using safe paths
        getSubschema("/participants", schemaId, []);
        getSubschema("/status", schemaId, []);
        getSubschema("/participants", schemaId, ["baspiV5"]);
        
        const stats1 = getCacheStats();
        expect(stats1.totalEntries).toBe(3);
        
        // Clear entries containing "participants"
        const cleared = clearSchemaCache("participants");
        expect(cleared).toBe(2);
        
        const stats2 = getCacheStats();
        expect(stats2.totalEntries).toBe(1);
        
        // Remaining entry should be status
        expect(stats2.cacheKeys[0]).toContain("status");
      });

      test("should return number of entries cleared", () => {
        getSubschema("/participants", schemaId, []);
        getSubschema("/status", schemaId, []);
        
        const cleared = clearSchemaCache();
        expect(cleared).toBe(2);
        
        const stats = getCacheStats();
        expect(stats.totalEntries).toBe(0);
      });

      test("should reset statistics when clearing all cache", () => {
        getSubschema(testPath, schemaId, overlays);
        getSubschema(testPath, schemaId, overlays); // Hit
        
        const statsBefore = getCacheStats();
        expect(statsBefore.hits).toBe(1);
        expect(statsBefore.misses).toBe(1);
        
        clearSchemaCache();
        
        const statsAfter = getCacheStats();
        expect(statsAfter.hits).toBe(0);
        expect(statsAfter.misses).toBe(0);
        expect(statsAfter.totalQueries).toBe(0);
      });
    });

    describe("Cache Pruning", () => {
      test("should prune entries by age", async () => {
        // Add some entries using safe paths
        getSubschema("/participants", schemaId, []);
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 10));
        
        getSubschema("/status", schemaId, []);
        
        const stats1 = getCacheStats();
        expect(stats1.totalEntries).toBe(2);
        
        // Prune entries older than 5ms
        const pruned = pruneCacheByAge(5);
        expect(pruned).toBe(1); // Should remove the older entry
        
        const stats2 = getCacheStats();
        expect(stats2.totalEntries).toBe(1);
      });

      test("should not prune entries younger than max age", () => {
        getSubschema("/participants", schemaId, []);
        
        const pruned = pruneCacheByAge(60000); // 1 minute
        expect(pruned).toBe(0);
        
        const stats = getCacheStats();
        expect(stats.totalEntries).toBe(1);
      });
    });

    describe("Cache Size Management", () => {
      test("should limit cache size by removing oldest entries", () => {
        // Add multiple entries using safe paths
        getSubschema("/participants", schemaId, []);
        getSubschema("/status", schemaId, []);
        getSubschema("/participants", schemaId, ["baspiV5"]);
        getSubschema("/status", schemaId, ["baspiV5"]);
        
        const stats1 = getCacheStats();
        expect(stats1.totalEntries).toBe(4);
        
        // Limit to 2 entries
        const removed = setCacheMaxSize(2);
        expect(removed).toBe(2);
        
        const stats2 = getCacheStats();
        expect(stats2.totalEntries).toBe(2);
      });

      test("should not remove entries if cache is under limit", () => {
        getSubschema("/participants", schemaId, []);
        
        const removed = setCacheMaxSize(10);
        expect(removed).toBe(0);
        
        const stats = getCacheStats();
        expect(stats.totalEntries).toBe(1);
      });

      test("should remove oldest entries first", async () => {
        // Add entries with delays to ensure different timestamps
        getSubschema("/participants", schemaId, []);
        await new Promise(resolve => setTimeout(resolve, 5));
        
        getSubschema("/status", schemaId, []);
        await new Promise(resolve => setTimeout(resolve, 5));
        
        getSubschema("/participants", schemaId, ["baspiV5"]);
        
        const stats1 = getCacheStats();
        expect(stats1.totalEntries).toBe(3);
        
        // Limit to 1 entry - should keep the newest one
        setCacheMaxSize(1);
        
        const stats2 = getCacheStats();
        expect(stats2.totalEntries).toBe(1);
        expect(stats2.cacheKeys[0]).toContain("baspiV5");
      });
    });

    describe("Integration with Existing Cache Behavior", () => {
      test("enhanced stats should work with existing cache operations", () => {
        // Use existing functions with a safe path
        const safePath = "/participants";
        const validator = getSubschemaValidator(safePath, schemaId, []);
        const schema = getSubschema(safePath, schemaId, []);
        const valid = isPathValid(safePath, schemaId, []);
        
        expect(typeof validator).toBe("function");
        expect(schema).toBeDefined();
        expect(valid).toBe(true);
        
        const stats = getCacheStats();
        expect(stats.totalQueries).toBeGreaterThan(0);
        expect(stats.hits).toBeGreaterThan(0);
        expect(stats.totalEntries).toBe(1);
      });

      test("should maintain backward compatibility", () => {
        // Existing test patterns should still work
        const schema1 = getSubschema(testPath, schemaId, overlays);
        const schema2 = getSubschema(testPath, schemaId, overlays);
        
        expect(schema1).toBe(schema2);
        
        const stats = getCacheStats();
        expect(stats).toHaveProperty("totalEntries");
        expect(stats).toHaveProperty("cacheKeys");
        expect(stats.totalEntries).toBe(1);
      });
    });
  });
});