const { isPathValid, getSubschema, getValidator } = require("../../../index.js");

const schemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

describe("buyerCircumstances path validation", () => {
  describe("isPathValid for buyerCircumstances fields", () => {
    test("validates path /offers/*/buyerCircumstances", () => {
      const path = "/offers/offer-123/buyerCircumstances";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/intendedUse", () => {
      const path = "/offers/offer-123/buyerCircumstances/intendedUse";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/firstTimeBuyer", () => {
      const path = "/offers/offer-123/buyerCircumstances/firstTimeBuyer";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/rightToBuy", () => {
      const path = "/offers/offer-123/buyerCircumstances/rightToBuy";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/ltdCompanyPurchase", () => {
      const path = "/offers/offer-123/buyerCircumstances/ltdCompanyPurchase";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/numberOfOwners", () => {
      const path = "/offers/offer-123/buyerCircumstances/numberOfOwners";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/numberOfExpats", () => {
      const path = "/offers/offer-123/buyerCircumstances/numberOfExpats";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/giftedEquity", () => {
      const path = "/offers/offer-123/buyerCircumstances/giftedEquity";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/numberOfGiftedDeposits", () => {
      const path = "/offers/offer-123/buyerCircumstances/numberOfGiftedDeposits";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/requiresMortgage", () => {
      const path = "/offers/offer-123/buyerCircumstances/requiresMortgage";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/helpToBuyEquityLoan", () => {
      const path = "/offers/offer-123/buyerCircumstances/helpToBuyEquityLoan";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/armedForcesHelpToBuy", () => {
      const path = "/offers/offer-123/buyerCircumstances/armedForcesHelpToBuy";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/numberOfHelpToBuyIsas", () => {
      const path = "/offers/offer-123/buyerCircumstances/numberOfHelpToBuyIsas";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/bridgingFinanceRepresentation", () => {
      const path = "/offers/offer-123/buyerCircumstances/bridgingFinanceRepresentation";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/depositAmount", () => {
      const path = "/offers/offer-123/buyerCircumstances/depositAmount";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/loanToValue", () => {
      const path = "/offers/offer-123/buyerCircumstances/loanToValue";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/numberOfBorrowers", () => {
      const path = "/offers/offer-123/buyerCircumstances/numberOfBorrowers";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/jointProprietorSoleMortgagor", () => {
      const path = "/offers/offer-123/buyerCircumstances/jointProprietorSoleMortgagor";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/soleProprietorJointMortgagor", () => {
      const path = "/offers/offer-123/buyerCircumstances/soleProprietorJointMortgagor";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/deedOfPostponement", () => {
      const path = "/offers/offer-123/buyerCircumstances/deedOfPostponement";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/separateRepresentation", () => {
      const path = "/offers/offer-123/buyerCircumstances/separateRepresentation";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/oldestBorrowerAge", () => {
      const path = "/offers/offer-123/buyerCircumstances/oldestBorrowerAge";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/mortgageTerm", () => {
      const path = "/offers/offer-123/buyerCircumstances/mortgageTerm";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/adverseCredit", () => {
      const path = "/offers/offer-123/buyerCircumstances/adverseCredit";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/employmentType", () => {
      const path = "/offers/offer-123/buyerCircumstances/employmentType";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/existingMortgagedProperties", () => {
      const path = "/offers/offer-123/buyerCircumstances/existingMortgagedProperties";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/annualIncome", () => {
      const path = "/offers/offer-123/buyerCircumstances/annualIncome";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/residencyStatus", () => {
      const path = "/offers/offer-123/buyerCircumstances/residencyStatus";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /offers/*/buyerCircumstances/nominatedLender", () => {
      const path = "/offers/offer-123/buyerCircumstances/nominatedLender";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("rejects invalid path /offers/*/buyerCircumstances/nonExistentField", () => {
      const path = "/offers/offer-123/buyerCircumstances/nonExistentField";
      expect(isPathValid(path, schemaId)).toBe(false);
    });
  });

  describe("getSubschema for buyerCircumstances", () => {
    test("returns correct subschema for buyerCircumstances", () => {
      const path = "/offers/offer-123/buyerCircumstances";
      const subschema = getSubschema(path, schemaId);

      expect(subschema).toBeDefined();
      expect(subschema.type).toBe("object");
      expect(subschema.properties).toBeDefined();
      expect(subschema.properties.intendedUse).toBeDefined();
      expect(subschema.properties.firstTimeBuyer).toBeDefined();
      expect(subschema.properties.requiresMortgage).toBeDefined();
    });

    test("returns correct subschema for intendedUse", () => {
      const path = "/offers/offer-123/buyerCircumstances/intendedUse";
      const subschema = getSubschema(path, schemaId);

      expect(subschema).toBeDefined();
      expect(subschema.type).toBe("string");
    });

    test("returns correct subschema for firstTimeBuyer (boolean)", () => {
      const path = "/offers/offer-123/buyerCircumstances/firstTimeBuyer";
      const subschema = getSubschema(path, schemaId);

      expect(subschema).toBeDefined();
      expect(subschema.type).toBe("boolean");
    });

    test("returns correct subschema for numberOfOwners (integer)", () => {
      const path = "/offers/offer-123/buyerCircumstances/numberOfOwners";
      const subschema = getSubschema(path, schemaId);

      expect(subschema).toBeDefined();
      expect(subschema.type).toBe("integer");
    });

    test("returns correct subschema for depositAmount (number)", () => {
      const path = "/offers/offer-123/buyerCircumstances/depositAmount";
      const subschema = getSubschema(path, schemaId);

      expect(subschema).toBeDefined();
      expect(subschema.type).toBe("number");
    });
  });

  describe("validation of buyerCircumstances data", () => {
    test("accepts valid offer with buyerCircumstances (requiresMortgage: Yes)", () => {
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
            buyerCircumstances: {
              intendedUse: "Owner occupied",
              firstTimeBuyer: true,
              rightToBuy: false,
              ltdCompanyPurchase: false,
              numberOfOwners: 2,
              numberOfExpats: 0,
              giftedEquity: false,
              numberOfGiftedDeposits: 1,
              requiresMortgage: "Yes",
              helpToBuyEquityLoan: false,
              armedForcesHelpToBuy: false,
              numberOfHelpToBuyIsas: 2,
              depositAmount: 50000,
              loanToValue: 80,
              numberOfBorrowers: 2,
              jointProprietorSoleMortgagor: false,
              soleProprietorJointMortgagor: false,
              deedOfPostponement: false,
              separateRepresentation: false,
              oldestBorrowerAge: 35,
              mortgageTerm: 25,
              existingMortgagedProperties: 0,
              annualIncome: 75000,
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts valid offer with buyerCircumstances (requiresMortgage: No)", () => {
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
            buyerCircumstances: {
              intendedUse: "Buy-to-let",
              firstTimeBuyer: false,
              requiresMortgage: "No",
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts offer with partial buyerCircumstances (requiresMortgage required)", () => {
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
            buyerCircumstances: {
              firstTimeBuyer: true,
              requiresMortgage: "Yes",
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("rejects buyerCircumstances without required requiresMortgage field", () => {
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
            buyerCircumstances: {
              firstTimeBuyer: true,
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects buyerCircumstances with wrong type for firstTimeBuyer", () => {
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
            buyerCircumstances: {
              firstTimeBuyer: "yes", // should be boolean
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects buyerCircumstances with wrong type for numberOfOwners", () => {
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
            buyerCircumstances: {
              numberOfOwners: "two", // should be integer
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects buyerCircumstances with wrong type for depositAmount", () => {
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
            buyerCircumstances: {
              depositAmount: "50000", // should be number
            },
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });
  });
});

describe("ownership new fields path validation", () => {
  describe("isPathValid for outstandingMortgage and existingLender", () => {
    test("validates path /propertyPack/ownership/outstandingMortgage", () => {
      const path = "/propertyPack/ownership/outstandingMortgage";
      expect(isPathValid(path, schemaId)).toBe(true);
    });

    test("validates path /propertyPack/ownership/existingLender", () => {
      const path = "/propertyPack/ownership/existingLender";
      expect(isPathValid(path, schemaId)).toBe(true);
    });
  });

  describe("getSubschema for ownership new fields", () => {
    test("returns correct subschema for outstandingMortgage", () => {
      const path = "/propertyPack/ownership/outstandingMortgage";
      const subschema = getSubschema(path, schemaId);

      expect(subschema).toBeDefined();
      expect(subschema.type).toBe("string");
    });

    test("returns correct subschema for existingLender", () => {
      const path = "/propertyPack/ownership/existingLender";
      const subschema = getSubschema(path, schemaId);

      expect(subschema).toBeDefined();
      expect(subschema.type).toBe("string");
    });
  });

  describe("validation of ownership new fields", () => {
    test("accepts valid ownership with outstandingMortgage and existingLender", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Seller",
            participantStatus: "Active",
          },
        ],
        propertyPack: {
          ownership: {
            outstandingMortgage: "Yes",
            existingLender: "Nationwide Building Society",
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("accepts ownership without outstandingMortgage and existingLender", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Seller",
            participantStatus: "Active",
          },
        ],
        propertyPack: {
          ownership: {
            numberOfSellers: 2,
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(true);
    });

    test("rejects ownership with wrong type for outstandingMortgage", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Seller",
            participantStatus: "Active",
          },
        ],
        propertyPack: {
          ownership: {
            outstandingMortgage: true, // should be string
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });

    test("rejects ownership with wrong type for existingLender", () => {
      const validator = getValidator(schemaId);
      const transaction = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        status: "active",
        participants: [
          {
            role: "Seller",
            participantStatus: "Active",
          },
        ],
        propertyPack: {
          ownership: {
            existingLender: 12345, // should be string
          },
        },
      };

      const isValid = validator(transaction);
      expect(isValid).toBe(false);
    });
  });
});
