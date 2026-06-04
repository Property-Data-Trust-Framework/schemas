const { getValidator } = require("../../../index.js");

const schemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

describe("Enquiries object validation", () => {
  describe("Valid enquiry keys", () => {
    test("accepts valid UUID as enquiry key", () => {
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
        enquiries: {
          "550e8400-e29b-41d4-a716-446655440000": {
            subject: "Boundary wall responsibility",
            status: "pending",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts valid DID as enquiry key", () => {
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
        enquiries: {
          "did:example:enquiry123": {
            subject: "Japanese knotweed treatment",
            status: "open",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts multiple enquiries with different key types", () => {
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
        enquiries: {
          "550e8400-e29b-41d4-a716-446655440000": {
            subject: "Drainage issues",
            status: "pending",
            messages: {},
          },
          "did:example:enquiry456": {
            subject: "Electrical certificates",
            status: "resolved",
            messages: {},
          },
          "enq-abc123": {
            subject: "Planning permissions",
            status: "withdrawn",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });
  });

  describe("Invalid enquiry keys", () => {
    test("rejects enquiry key starting with invalid character", () => {
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
        enquiries: {
          "-invalid-key": {
            subject: "Test enquiry",
            status: "pending",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects enquiry key with spaces", () => {
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
        enquiries: {
          "invalid key with spaces": {
            subject: "Test enquiry",
            status: "pending",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects enquiry key with special characters", () => {
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
        enquiries: {
          "invalid@key#here": {
            subject: "Test enquiry",
            status: "pending",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });
  });

  describe("Valid enquiry contents", () => {
    test("accepts enquiry with all required fields", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Roof condition",
            status: "pending",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts all valid status values", () => {
      const validator = getValidator(schemaId);
      const validStatuses = [
        "pending",
        "open",
        "resolved",
        "resolvedWithCondition",
        "withdrawn",
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
          enquiries: {
            "enq-1": {
              subject: "Test enquiry",
              status: status,
              messages: {},
              ...(status === "resolvedWithCondition" && {
                resolutionCondition: "Subject to completion of remedial works",
              }),
            },
          },
        };

        const isValid = validator(transaction);
        expect(isValid).toBe(true);
      });
    });

    test("accepts enquiry with resolutionCondition when status is resolvedWithCondition", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Damp in basement",
            status: "resolvedWithCondition",
            resolutionCondition:
              "Seller to provide evidence of damp-proofing works within 30 days",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts enquiry with optional resolutionCondition when status is not resolvedWithCondition", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Roof condition",
            status: "resolved",
            resolutionCondition: "No action required",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts enquiry with messages containing all required fields", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Boundary dispute",
            status: "open",
            messages: {
              "msg-1": {
                datetime: "2025-01-15T10:30:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText:
                  "Can you provide details of the boundary agreement with the neighboring property?",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts enquiry with multiple messages", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Tree preservation order",
            status: "open",
            messages: {
              "msg-1": {
                datetime: "2025-01-15T10:30:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText: "Is there a tree preservation order on the oak tree in the garden?",
              },
              "msg-2": {
                datetime: "2025-01-16T14:20:00Z",
                originatorRole: "Seller's Conveyancer",
                destinationRole: "Buyer's Conveyancer",
                messageText: "Yes, we will provide documentation from the council.",
              },
              "msg-3": {
                datetime: "2025-01-17T09:15:00Z",
                originatorRole: "Seller's Conveyancer",
                destinationRole: "Buyer's Conveyancer",
                messageText: "Please find attached the TPO certificate from the local authority.",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts all valid participant roles for originatorRole and destinationRole", () => {
      const validator = getValidator(schemaId);
      const validRoles = [
        "Seller",
        "Seller's Conveyancer",
        "Buyer",
        "Buyer's Conveyancer",
        "Estate Agent",
        "Buyer's Agent",
        "Surveyor",
        "Mortgage Broker",
        "Lender",
      ];

      validRoles.forEach((role) => {
        const transaction = {
          transactionId: "123e4567-e89b-12d3-a456-426614174000",
          status: "active",
          participants: [
            {
              role: "Buyer",
              participantStatus: "Active",
            },
          ],
          enquiries: {
            "enq-1": {
              subject: "Test enquiry",
              status: "open",
              messages: {
                "msg-1": {
                  datetime: "2025-01-15T10:30:00Z",
                  originatorRole: role,
                  destinationRole: "Buyer's Conveyancer",
                  messageText: "Test message",
                },
              },
            },
          },
        };

        const isValid = validator(transaction);
        expect(isValid).toBe(true);
      });
    });

    test("accepts message key as UUID", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "open",
            messages: {
              "550e8400-e29b-41d4-a716-446655440000": {
                datetime: "2025-01-15T10:30:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText: "Test message",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts message key as DID", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "open",
            messages: {
              "did:example:message123": {
                datetime: "2025-01-15T10:30:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText: "Test message",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });
  });

  describe("Invalid enquiry contents", () => {
    test("rejects enquiry missing required subject field", () => {
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
        enquiries: {
          "enq-1": {
            status: "pending",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("required property"))
      ).toBe(true);
    });

    test("rejects enquiry missing required status field", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects enquiry missing required messages field", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "pending",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects enquiry with invalid status value", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "invalid-status",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects enquiry with status resolvedWithCondition but missing resolutionCondition", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Damp issue",
            status: "resolvedWithCondition",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("required property"))
      ).toBe(true);
    });

    test("rejects message missing required datetime field", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "open",
            messages: {
              "msg-1": {
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText: "Test message",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects message missing required originatorRole field", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "open",
            messages: {
              "msg-1": {
                datetime: "2025-01-15T10:30:00Z",
                destinationRole: "Seller's Conveyancer",
                messageText: "Test message",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects message missing required destinationRole field", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "open",
            messages: {
              "msg-1": {
                datetime: "2025-01-15T10:30:00Z",
                originatorRole: "Buyer's Conveyancer",
                messageText: "Test message",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects message missing required messageText field", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "open",
            messages: {
              "msg-1": {
                datetime: "2025-01-15T10:30:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects message with invalid datetime format", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "open",
            messages: {
              "msg-1": {
                datetime: "15/01/2025 10:30",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText: "Test message",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects message with invalid originatorRole", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "open",
            messages: {
              "msg-1": {
                datetime: "2025-01-15T10:30:00Z",
                originatorRole: "Invalid Role",
                destinationRole: "Seller's Conveyancer",
                messageText: "Test message",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects message with invalid destinationRole", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "open",
            messages: {
              "msg-1": {
                datetime: "2025-01-15T10:30:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Invalid Role",
                messageText: "Test message",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects message key starting with invalid character", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "open",
            messages: {
              "-invalid-message-key": {
                datetime: "2025-01-15T10:30:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText: "Test message",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects message key with spaces", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "open",
            messages: {
              "invalid message key": {
                datetime: "2025-01-15T10:30:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText: "Test message",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects messages as array instead of object", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Test enquiry",
            status: "open",
            messages: [
              {
                datetime: "2025-01-15T10:30:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText: "Test message",
              },
            ],
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });
  });

  describe("Empty enquiries object", () => {
    test("accepts empty enquiries object", () => {
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
        enquiries: {},
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts transaction without enquiries property", () => {
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

    test("accepts enquiry with empty messages object", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Newly created enquiry",
            status: "pending",
            messages: {},
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });
  });

  describe("Complex enquiry scenarios", () => {
    test("accepts complete enquiry lifecycle with multiple messages", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Buyer",
            participantStatus: "Active",
          },
          {
            role: "Seller",
            participantStatus: "Active",
          },
        ],
        enquiries: {
          "enq-drainage": {
            subject: "Drainage and water runoff concerns",
            status: "resolvedWithCondition",
            resolutionCondition:
              "Seller to provide drainage survey report before exchange of contracts",
            messages: {
              "msg-001": {
                datetime: "2025-01-10T09:00:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText:
                  "Our client has raised concerns about drainage in the rear garden. Can you provide details of any drainage works carried out?",
              },
              "msg-002": {
                datetime: "2025-01-12T14:30:00Z",
                originatorRole: "Seller's Conveyancer",
                destinationRole: "Buyer's Conveyancer",
                messageText:
                  "The seller confirms drainage works were carried out in 2020. We will obtain the relevant documentation.",
              },
              "msg-003": {
                datetime: "2025-01-15T11:00:00Z",
                originatorRole: "Seller's Conveyancer",
                destinationRole: "Buyer's Conveyancer",
                messageText:
                  "Please find attached the drainage survey report from 2020 and building control certificates.",
              },
              "msg-004": {
                datetime: "2025-01-17T10:00:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText:
                  "Thank you. Our client's surveyor has reviewed the documentation and is satisfied, subject to a final drainage inspection before exchange.",
              },
            },
          },
          "enq-boundaries": {
            subject: "Boundary responsibilities",
            status: "resolved",
            messages: {
              "msg-101": {
                datetime: "2025-01-08T10:00:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText:
                  "Please confirm which boundaries the seller is responsible for maintaining.",
              },
              "msg-102": {
                datetime: "2025-01-09T15:00:00Z",
                originatorRole: "Seller's Conveyancer",
                destinationRole: "Buyer's Conveyancer",
                messageText:
                  "The seller is responsible for the left-hand boundary fence and the rear hedge, as shown on the title plan. The right-hand fence is the neighbor's responsibility.",
              },
            },
          },
          "enq-planning": {
            subject: "Planning permission for extension",
            status: "withdrawn",
            messages: {
              "msg-201": {
                datetime: "2025-01-11T09:30:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText:
                  "Can you confirm whether planning permission was obtained for the rear extension?",
              },
              "msg-202": {
                datetime: "2025-01-12T16:00:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText:
                  "Please disregard previous enquiry. Our client has confirmed they have obtained the planning documentation from the council search.",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts enquiry with mixed participant roles in messages", () => {
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
        enquiries: {
          "enq-1": {
            subject: "Survey findings requiring seller input",
            status: "open",
            messages: {
              "msg-1": {
                datetime: "2025-01-15T09:00:00Z",
                originatorRole: "Surveyor",
                destinationRole: "Buyer's Conveyancer",
                messageText: "Survey has identified potential subsidence. Recommend further investigation.",
              },
              "msg-2": {
                datetime: "2025-01-15T11:00:00Z",
                originatorRole: "Buyer's Conveyancer",
                destinationRole: "Seller's Conveyancer",
                messageText: "Please see surveyor's comments regarding subsidence. Can the seller provide any relevant information?",
              },
              "msg-3": {
                datetime: "2025-01-16T14:00:00Z",
                originatorRole: "Seller's Conveyancer",
                destinationRole: "Buyer's Conveyancer",
                messageText: "The seller has confirmed no subsidence issues known. Will investigate further with structural engineer.",
              },
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });
  });
});
