const { getValidator } = require("../../../index.js");

const schemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

describe("Offers object validation", () => {
  describe("Valid offer keys", () => {
    test("accepts valid UUID as offer key", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "550e8400-e29b-41d4-a716-446655440000": {
            amount: 250000,
            currency: "GBP",
            status: "Pending",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts valid DID as offer key", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "did:example:123456789abcdefghi": {
            amount: 300000,
            currency: "GBP",
            status: "Accepted",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts DID with various allowed characters", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "did:web:example.com:users:alice": {
            amount: 275000,
            currency: "GBP",
            status: "Pending",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts multiple offers with different key types", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "550e8400-e29b-41d4-a716-446655440000": {
            amount: 250000,
            currency: "GBP",
            status: "Pending",
          },
          "did:example:buyer123": {
            amount: 260000,
            currency: "GBP",
            status: "Accepted",
          },
          "offer-abc123": {
            amount: 240000,
            currency: "GBP",
            status: "Rejected",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });
  });

  describe("Invalid offer keys", () => {
    test("rejects offer key starting with invalid character", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "-invalid-key": {
            amount: 250000,
            currency: "GBP",
            status: "Pending",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
      expect(validator.errors.length).toBeGreaterThan(0);
    });

    test("rejects offer key with spaces", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "invalid key with spaces": {
            amount: 250000,
            currency: "GBP",
            status: "Pending",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects offer key with special characters", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "invalid@key#here": {
            amount: 250000,
            currency: "GBP",
            status: "Pending",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });
  });

  describe("Valid offer contents", () => {
    test("accepts offer with all required fields", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            amount: 250000,
            currency: "GBP",
            status: "Pending",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts offer with all fields including optional ones", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            amount: 250000,
            currency: "GBP",
            status: "Accepted",
            inclusions: ["curtains", "carpets", "light fixtures"],
            exclusions: ["garden furniture", "shed"],
            conditions: [
              "Subject to survey",
              "Subject to mortgage approval",
            ],
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts all valid status values", () => {
      const validator = getValidator(schemaId);
      const validStatuses = [
        "Pending",
        "Withdrawn",
        "Rejected",
        "Accepted",
        "Note of Interest",
      ];

      validStatuses.forEach((status) => {
        const transaction = {
          transactionId: "123e4567-e89b-12d3-a456-426614174000",
          status: "active",
          participants: [
            {
              role: "Buyer",
              participantStatus: "Active",
            },
          ],
          offers: {
            "offer-1": {
              amount: 250000,
              currency: "GBP",
              status: status,
            },
          },
        };

        const isValid = validator(transaction);
        expect(isValid).toBe(true);
      });
    });

    test("accepts valid currency codes", () => {
      const validator = getValidator(schemaId);
      const validCurrencies = ["GBP", "USD", "EUR"];

      validCurrencies.forEach((currency) => {
        const transaction = {
          transactionId: "123e4567-e89b-12d3-a456-426614174000",
          status: "active",
          participants: [
            {
              role: "Buyer",
              participantStatus: "Active",
            },
          ],
          offers: {
            "offer-1": {
              amount: 250000,
              currency: currency,
              status: "Pending",
            },
          },
        };

        const isValid = validator(transaction);
        expect(isValid).toBe(true);
      });
    });

    test("accepts zero amount", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            amount: 0,
            currency: "GBP",
            status: "Note of Interest",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });
  });

  describe("Invalid offer contents", () => {
    test("accepts offer without amount field (no required fields in schema)", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            currency: "GBP",
            status: "Pending",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts offer without currency field (no required fields in schema)", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            amount: 250000,
            status: "Pending",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts offer without status field (no required fields in schema)", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            amount: 250000,
            currency: "GBP",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("rejects offer with invalid status value", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            amount: 250000,
            currency: "GBP",
            status: "invalid-status",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects offer with negative amount", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            amount: -100000,
            currency: "GBP",
            status: "Pending",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects offer with invalid currency code format", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            amount: 250000,
            currency: "gb",
            status: "Pending",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects offer with lowercase currency code", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            amount: 250000,
            currency: "gbp",
            status: "Pending",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects offer with non-array inclusions", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            amount: 250000,
            currency: "GBP",
            status: "Pending",
            inclusions: "curtains",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects offer with non-string items in inclusions array", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            amount: 250000,
            currency: "GBP",
            status: "Pending",
            inclusions: ["curtains", 123, "carpets"],
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects offer with non-array exclusions", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            amount: 250000,
            currency: "GBP",
            status: "Pending",
            exclusions: { item: "garden furniture" },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects offer with non-array conditions", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {
          "offer-1": {
            amount: 250000,
            currency: "GBP",
            status: "Pending",
            conditions: "Subject to survey",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });
  });

  describe("Empty offers object", () => {
    test("accepts empty offers object", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
        offers: {},
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts transaction without offers property", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });
  });

  describe("Buyer participant with offerId", () => {
    test("accepts Buyer with valid offerId", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
            offerId: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
        offers: {
          "550e8400-e29b-41d4-a716-446655440000": {
            amount: 250000,
            currency: "GBP",
            status: "Accepted",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts Buyer with offerId as DID", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
            offerId: "did:example:buyer123",
          },
        ],
        offers: {
          "did:example:buyer123": {
            amount: 260000,
            currency: "GBP",
            status: "Accepted",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts Buyer without offerId", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
        ],
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("rejects Buyer with invalid offerId format starting with dash", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
            offerId: "-invalid-offer-id",
          },
        ],
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
      // Should fail because offerId pattern requires starting with alphanumeric
      const offerIdError = validator.errors.find(
        (e) => e.instancePath.includes("offerId")
      );
      expect(offerIdError).toBeDefined();
    });

    test("rejects Buyer with offerId containing spaces", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
            offerId: "invalid offer id",
          },
        ],
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("accepts multiple Buyers with different offerIds", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
            offerId: "offer-1",
          },
          {
            role: "Buyer",
            participantStatus: "Active",
            offerId: "offer-2",
          },
        ],
        offers: {
          "offer-1": {
            amount: 250000,
            currency: "GBP",
            status: "Pending",
          },
          "offer-2": {
            amount: 260000,
            currency: "GBP",
            status: "Accepted",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts Buyer with offerId referencing non-existent offer (schema allows this)", () => {
      // Note: The schema doesn't enforce referential integrity between offerId and offers keys
      // This would need to be enforced at the application level
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
            offerId: "non-existent-offer",
          },
        ],
        offers: {},
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("allows offerId on non-Buyer participants (schema doesn't restrict additionalProperties)", () => {
      // Note: The schema uses oneOf with discriminator on role, but doesn't use
      // additionalProperties: false, so extra properties are allowed on all participants
      // This is intentional to maintain flexibility
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Seller",
            participantStatus: "Active",
            offerId: "offer-1",
          },
        ],
      };

      const isValid = validator(transaction);
      // This will actually pass because additionalProperties is not restricted
      expect(isValid).toBe(true);
    });
  });
});
