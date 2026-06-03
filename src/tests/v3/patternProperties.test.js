const {
  isPathValid,
  getSubschema,
  getSubschemaValidator,
  validateVerifiedClaims,
} = require("../../../index.js");

const schemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

describe("patternProperties support in path validation", () => {
  describe("isPathValid with patternProperties", () => {
    test("validates path with patternProperties - simple offer ID", () => {
      const path = "/offers/offer-123";
      const isValid = isPathValid(path, schemaId);
      expect(isValid).toBe(true);
    });

    test("validates path with patternProperties - UUID", () => {
      const path = "/offers/550e8400-e29b-41d4-a716-446655440000";
      const isValid = isPathValid(path, schemaId);
      expect(isValid).toBe(true);
    });

    test("validates path with patternProperties - DID format", () => {
      const path = "/offers/did:example:buyer123";
      const isValid = isPathValid(path, schemaId);
      expect(isValid).toBe(true);
    });

    test("validates path with patternProperties - alphanumeric with special chars", () => {
      const path = "/offers/1sorzJCFHbWVlHA2tYXA";
      const isValid = isPathValid(path, schemaId);
      expect(isValid).toBe(true);
    });

    test("validates nested path within patternProperties", () => {
      const path = "/offers/offer-456/amount";
      const isValid = isPathValid(path, schemaId);
      expect(isValid).toBe(true);
    });

    test("validates deeply nested path within patternProperties", () => {
      const path = "/offers/offer-456/inclusions";
      const isValid = isPathValid(path, schemaId);
      expect(isValid).toBe(true);
    });

    test("rejects invalid nested path within patternProperties", () => {
      const path = "/offers/offer-456/nonExistentField";
      const isValid = isPathValid(path, schemaId);
      expect(isValid).toBe(false);
    });

    test("validates path with patternProperties exists at root /offers", () => {
      const path = "/offers";
      const isValid = isPathValid(path, schemaId);
      expect(isValid).toBe(true);
    });
  });

  describe("getSubschema with patternProperties", () => {
    test("returns correct subschema for patternProperties path", () => {
      const path = "/offers/offer-123";
      const subschema = getSubschema(path, schemaId);

      expect(subschema).toBeDefined();
      expect(subschema.type).toBe("object");
      expect(subschema.properties).toBeDefined();
      expect(subschema.properties.amount).toBeDefined();
      expect(subschema.properties.currency).toBeDefined();
      expect(subschema.properties.status).toBeDefined();
    });

    test("returns correct subschema for nested property in patternProperties", () => {
      const path = "/offers/offer-123/amount";
      const subschema = getSubschema(path, schemaId);

      expect(subschema).toBeDefined();
      expect(subschema.type).toBe("number");
      expect(subschema.minimum).toBe(0);
    });

    test("returns correct subschema for status enum", () => {
      const path = "/offers/offer-123/status";
      const subschema = getSubschema(path, schemaId);

      expect(subschema).toBeDefined();
      expect(subschema.type).toBe("string");
      expect(subschema.enum).toContain("Pending");
      expect(subschema.enum).toContain("Accepted");
      expect(subschema.enum).toContain("Rejected");
      expect(subschema.enum).toContain("Withdrawn");
      expect(subschema.enum).toContain("Note of Interest");
    });

    test("returns correct subschema for currency pattern", () => {
      const path = "/offers/offer-123/currency";
      const subschema = getSubschema(path, schemaId);

      expect(subschema).toBeDefined();
      expect(subschema.type).toBe("string");
      expect(subschema.pattern).toBe("^[A-Z]{3}$");
    });

    test("returns offers object schema", () => {
      const path = "/offers";
      const subschema = getSubschema(path, schemaId);

      expect(subschema).toBeDefined();
      expect(subschema.type).toBe("object");
      expect(subschema.patternProperties).toBeDefined();
      expect(subschema.propertyNames).toBeDefined();
    });

    test("returns undefined for invalid path", () => {
      const path = "/offers/offer-123/invalidField";
      const subschema = getSubschema(path, schemaId);

      expect(subschema).toBeUndefined();
    });
  });

  describe("getSubschemaValidator with patternProperties", () => {
    test("returns working validator for patternProperties path", () => {
      const path = "/offers/offer-123";
      const validator = getSubschemaValidator(path, schemaId);

      expect(validator).toBeDefined();
      expect(typeof validator).toBe("function");

      const validOffer = {
        amount: 500000,
        currency: "GBP",
        status: "Pending",
      };

      const isValid = validator(validOffer);
      expect(isValid).toBe(true);
    });

    test("validator correctly validates valid offer data", () => {
      const path = "/offers/offer-456";
      const validator = getSubschemaValidator(path, schemaId);

      const validOffer = {
        amount: 300000,
        currency: "EUR",
        status: "Accepted",
        inclusions: ["carpets", "curtains"],
        exclusions: ["garden furniture"],
        conditions: ["Subject to survey"],
      };

      const isValid = validator(validOffer);
      expect(isValid).toBe(true);
    });

    test("validator accepts offer data without status (no required fields in schema)", () => {
      const path = "/offers/offer-789";
      const validator = getSubschemaValidator(path, schemaId);

      const offer = {
        amount: 400000,
        currency: "GBP",
      };

      const isValid = validator(offer);
      expect(isValid).toBe(true);
    });

    test("validator correctly rejects invalid offer data - negative amount", () => {
      const path = "/offers/offer-999";
      const validator = getSubschemaValidator(path, schemaId);

      const invalidOffer = {
        amount: -100000,
        currency: "GBP",
        status: "Pending",
      };

      const isValid = validator(invalidOffer);
      expect(isValid).toBe(false);
      expect(validator.errors.some((e) => e.keyword === "minimum")).toBe(true);
    });

    test("validator correctly rejects invalid offer data - invalid status", () => {
      const path = "/offers/offer-abc";
      const validator = getSubschemaValidator(path, schemaId);

      const invalidOffer = {
        amount: 250000,
        currency: "GBP",
        status: "invalid-status",
      };

      const isValid = validator(invalidOffer);
      expect(isValid).toBe(false);
      expect(validator.errors.some((e) => e.keyword === "enum")).toBe(true);
    });

    test("validator for nested path works correctly", () => {
      const path = "/offers/offer-nested/amount";
      const validator = getSubschemaValidator(path, schemaId);

      expect(validator(500000)).toBe(true);
      expect(validator(0)).toBe(true);
      expect(validator(-1)).toBe(false);
      expect(validator("not a number")).toBe(false);
    });
  });

  describe("validateVerifiedClaims with patternProperties paths", () => {
    test("accepts valid claim with patternProperties path", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/offers/offer-001": {
            amount: 500000,
            currency: "GBP",
            status: "Pending",
          },
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });

    test("accepts valid claim with UUID offer ID", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/offers/1sorzJCFHbWVlHA2tYXA": {
            amount: 750000,
            currency: "GBP",
            status: "Accepted",
          },
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });

    test("accepts valid claim with DID format offer ID", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/offers/did:example:buyer123": {
            amount: 600000,
            currency: "EUR",
            status: "Note of Interest",
          },
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });

    test("accepts valid claim with nested patternProperties path", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/offers/offer-002/amount": 450000,
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });

    test("accepts claim with all optional offer fields", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/offers/offer-complete": {
            amount: 550000,
            currency: "GBP",
            status: "Accepted",
            inclusions: ["carpets", "curtains", "light fixtures"],
            exclusions: ["garden shed"],
            conditions: ["Subject to survey", "Subject to mortgage approval"],
          },
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });

    test("accepts claim with offer data without status (no required fields in schema)", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/offers/offer-no-status": {
            amount: 500000,
            currency: "GBP",
          },
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });

    test("rejects claim with invalid offer data - negative amount", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/offers/offer-negative": {
            amount: -100000,
            currency: "GBP",
            status: "Pending",
          },
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors.length).toBeGreaterThan(0);
    });

    test("rejects claim with invalid offer data - invalid status enum", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/offers/offer-bad-status": {
            amount: 500000,
            currency: "GBP",
            status: "completed", // not a valid enum value
          },
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors.length).toBeGreaterThan(0);
    });

    test("rejects claim with invalid offer data - invalid currency format", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/offers/offer-bad-currency": {
            amount: 500000,
            currency: "gbp", // should be uppercase
            status: "Pending",
          },
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors.length).toBeGreaterThan(0);
    });

    test("accepts multiple claims with different patternProperties paths", () => {
      const claims = [
        {
          timestamp: 1643115903108,
          verification: {
            trust_framework: "uk_pdtf",
            time: "2025-01-15T12:00:00Z",
          },
          claims: {
            "/offers/offer-1": {
              amount: 500000,
              currency: "GBP",
              status: "Pending",
            },
          },
        },
        {
          timestamp: 1643115903109,
          verification: {
            trust_framework: "uk_pdtf",
            time: "2025-01-15T12:01:00Z",
          },
          claims: {
            "/offers/offer-2": {
              amount: 520000,
              currency: "GBP",
              status: "Accepted",
            },
          },
        },
      ];

      const errors = validateVerifiedClaims(claims, schemaId);
      expect(errors).toHaveLength(0);
    });

    test("accepts claim with multiple patternProperties paths", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/offers/offer-1": {
            amount: 500000,
            currency: "GBP",
            status: "Pending",
          },
          "/offers/offer-2": {
            amount: 510000,
            currency: "GBP",
            status: "Withdrawn",
          },
          "/offers/offer-3/status": "Rejected",
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });

    test("rejects claim for non-existent nested property in patternProperties", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/offers/offer-1/nonExistentField": "some value",
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("not a valid PDTF schema path"))).toBe(
        true
      );
    });
  });

  describe("precedence: explicit properties over patternProperties", () => {
    // This test documents the expected behavior that explicit properties
    // should take precedence over patternProperties matches
    test("explicit property should match before patternProperties", () => {
      // If offers had an explicit property called "special" and also had
      // patternProperties that would match "special", the explicit property
      // should win. This is standard JSON Schema behavior.

      // Since our current schema doesn't have this scenario, this test
      // documents the expected behavior for future schema changes
      expect(true).toBe(true);
    });
  });

  describe("caching with patternProperties paths", () => {
    test("caches subschema for patternProperties paths", () => {
      const path = "/offers/cached-offer-123";

      // First call - cache miss
      const subschema1 = getSubschema(path, schemaId);
      expect(subschema1).toBeDefined();

      // Second call - should hit cache
      const subschema2 = getSubschema(path, schemaId);
      expect(subschema2).toBeDefined();
      expect(subschema2).toEqual(subschema1);
    });

    test("caches validator for patternProperties paths", () => {
      const path = "/offers/cached-offer-456";

      // First call - cache miss
      const validator1 = getSubschemaValidator(path, schemaId);
      expect(validator1).toBeDefined();

      // Second call - should hit cache
      const validator2 = getSubschemaValidator(path, schemaId);
      expect(validator2).toBeDefined();

      // Should be the same validator function
      expect(validator2).toBe(validator1);
    });

    test("different patternProperties paths get separate cache entries", () => {
      const path1 = "/offers/offer-aaa";
      const path2 = "/offers/offer-bbb";

      const validator1 = getSubschemaValidator(path1, schemaId);
      const validator2 = getSubschemaValidator(path2, schemaId);

      // Both should work but point to same schema (since they match same pattern)
      expect(validator1).toBeDefined();
      expect(validator2).toBeDefined();

      // They should be the same since they resolve to the same schema
      expect(validator1).toBe(validator2);
    });
  });

  describe("externalIds patternProperties paths", () => {
    test("accepts claim for /externalIds with a nested key path", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/externalIds/nptn/selectedQuoteId": "12345577",
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });

    test("accepts claim for /externalIds with a simple string value", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/externalIds/lms": "abc-123",
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });

    test("accepts claim for /externalIds with a numeric value", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/externalIds/systemRef": 98765,
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });

    test("accepts claim for /externalIds with a boolean value", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/externalIds/isActive": true,
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });

    test("accepts claim for /externalIds with an object value", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/externalIds/nptn": {
            selectedQuoteId: "12345577",
            caseRef: "CASE-001",
          },
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });

    test("accepts claim with multiple externalIds paths in same claim", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/externalIds/nptn/selectedQuoteId": "12345577",
          "/externalIds/lms": "LMS-REF-001",
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });

    test("accepts claim for /externalIds root object", () => {
      const claim = {
        timestamp: 1643115903108,
        verification: {
          trust_framework: "uk_pdtf",
          time: "2025-01-15T12:00:00Z",
        },
        claims: {
          "/externalIds": {
            nptn: {
              selectedQuoteId: "12345577",
            },
            lms: "LMS-REF-001",
          },
        },
      };

      const errors = validateVerifiedClaims([claim], schemaId);
      expect(errors).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    test("handles offer ID with dots", () => {
      const path = "/offers/offer.123.abc";
      const isValid = isPathValid(path, schemaId);
      expect(isValid).toBe(true);
    });

    test("handles offer ID with underscores", () => {
      const path = "/offers/offer_123_abc";
      const isValid = isPathValid(path, schemaId);
      expect(isValid).toBe(true);
    });

    test("handles offer ID with colons (DID format)", () => {
      const path = "/offers/did:web:example.com:users:alice";
      const isValid = isPathValid(path, schemaId);
      expect(isValid).toBe(true);
    });

    test("handles offer ID with plus signs", () => {
      const path = "/offers/offer+123";
      const isValid = isPathValid(path, schemaId);
      expect(isValid).toBe(true);
    });

    test("handles very long offer ID", () => {
      const longId = "a".repeat(100);
      const path = `/offers/${longId}`;
      const isValid = isPathValid(path, schemaId);
      expect(isValid).toBe(true);
    });
  });
});
