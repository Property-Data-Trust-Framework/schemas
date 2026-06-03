const { getSubschemaValidator } = require("../../../index.js");

const schemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

// These tests guard the audit fixes that aligned discriminator `oneOf` branches
// with their root `enum` declarations in combined.json. For each field we
// verify every enum value validates, and (for the fields where we removed a
// stale oneOf branch) that the removed value is rejected.

describe("Discriminator oneOf branches cover root enum", () => {
  describe("typeOfConstruction.buildingSafety yesNo", () => {
    const path = "/propertyPack/typeOfConstruction/buildingSafety";
    const validator = getSubschemaValidator(path, schemaId);

    test.each([
      ["No"],
      ["Not applicable"],
      ["Not known"],
    ])("accepts yesNo = %j without details", (yesNo) => {
      expect(validator({ yesNo })).toBe(true);
    });

    test("accepts yesNo = 'Yes' with required details", () => {
      expect(
        validator({
          yesNo: "Yes",
          details: "Cladding remediation under review",
        })
      ).toBe(true);
    });
  });

  describe("heating heatingInGoodWorkingOrder yesNo", () => {
    const path =
      "/propertyPack/heating/heatingSystem/centralHeatingDetails/heatingInGoodWorkingOrder";
    const validator = getSubschemaValidator(path, schemaId);

    test.each([["Yes"], ["Not known"]])(
      "accepts yesNo = %j without details",
      (yesNo) => {
        expect(validator({ yesNo })).toBe(true);
      }
    );

    test("accepts yesNo = 'No' with details", () => {
      expect(validator({ yesNo: "No", details: "Boiler intermittent" })).toBe(
        true
      );
    });
  });

  describe("rightsAndInformalArrangements.sharedContributions yesNo", () => {
    const path = "/propertyPack/rightsAndInformalArrangements/sharedContributions";
    const validator = getSubschemaValidator(path, schemaId);

    test.each([["No"], ["Not applicable"]])(
      "accepts yesNo = %j without details",
      (yesNo) => {
        expect(validator({ yesNo })).toBe(true);
      }
    );

    test("accepts yesNo = 'Yes' with details", () => {
      expect(
        validator({ yesNo: "Yes", details: "Shared driveway maintenance" })
      ).toBe(true);
    });
  });

  describe("rightsAndInformalArrangements.accessRestrictionAttempts yesNo", () => {
    const path =
      "/propertyPack/rightsAndInformalArrangements/accessRestrictionAttempts";
    const validator = getSubschemaValidator(path, schemaId);

    test.each([["No"], ["Not known"]])(
      "accepts yesNo = %j without details",
      (yesNo) => {
        expect(validator({ yesNo })).toBe(true);
      }
    );

    test("accepts yesNo = 'Yes' with details", () => {
      expect(
        validator({ yesNo: "Yes", details: "Neighbour disputed access" })
      ).toBe(true);
    });
  });

  describe("legalBoundaries.flyingFreehold yesNo", () => {
    const path = "/propertyPack/legalBoundaries/flyingFreehold";
    const validator = getSubschemaValidator(path, schemaId);

    test.each([["No"], ["Not applicable"], ["Not known"]])(
      "accepts yesNo = %j without details",
      (yesNo) => {
        expect(validator({ yesNo })).toBe(true);
      }
    );

    test("accepts yesNo = 'Yes' with details", () => {
      expect(
        validator({ yesNo: "Yes", details: "Bedroom overhangs access road" })
      ).toBe(true);
    });
  });

  describe("heating replacementOtherThanBoiler yesNo", () => {
    const path =
      "/propertyPack/heating/heatingSystem/centralHeatingDetails/replacementOtherThanBoiler";
    const validator = getSubschemaValidator(path, schemaId);

    test.each([["No"], ["Not known"]])(
      "accepts yesNo = %j without attachments",
      (yesNo) => {
        expect(validator({ yesNo })).toBe(true);
      }
    );

    test("accepts yesNo = 'Yes' with attachments", () => {
      expect(validator({ yesNo: "Yes", attachments: "Attached" })).toBe(true);
    });
  });
});

describe("Discriminator oneOf branches reconciled with root enum", () => {
  describe("fixturesAndFittings.kitchen.otherItems isIncludedOrExcluded", () => {
    const path = "/propertyPack/fixturesAndFittings/kitchen/otherItems";
    const validator = getSubschemaValidator(path, schemaId);

    test("accepts Included with fittedOrFreestanding", () => {
      expect(
        validator([
          {
            itemName: "Wine fridge",
            isIncludedOrExcluded: "Included",
            fittedOrFreestanding: { fittedOrFreestanding: "Freestanding" },
          },
        ])
      ).toBe(true);
    });

    test("accepts Excluded with price + fittedOrFreestanding", () => {
      expect(
        validator([
          {
            itemName: "Range cooker",
            isIncludedOrExcluded: "Excluded",
            price: 500,
            fittedOrFreestanding: { fittedOrFreestanding: "Fitted" },
          },
        ])
      ).toBe(true);
    });

    test("rejects removed 'None' branch", () => {
      expect(
        validator([{ itemName: "Toaster", isIncludedOrExcluded: "None" }])
      ).toBe(false);
    });
  });

  describe("environmentalIssues.otherEnvironmental riskIndicator", () => {
    const path = "/propertyPack/environmentalIssues/otherEnvironmental";
    const validator = getSubschemaValidator(path, schemaId);

    test("accepts riskIndicator = 'No'", () => {
      expect(validator({ riskIndicator: "No" })).toBe(true);
    });

    test("accepts riskIndicator = 'Yes' with summary", () => {
      expect(
        validator({ riskIndicator: "Yes", summary: "Air pollution nearby" })
      ).toBe(true);
    });

    test("rejects removed 'Not known' value", () => {
      expect(validator({ riskIndicator: "Not known" })).toBe(false);
    });
  });

  describe("riskAssessments assessmentsCarriedOut case-aligned with enum", () => {
    const path =
      "/propertyPack/ownership/ownershipsToBeTransferred/2/leaseholdInformation/buildingsInsurance/managedAreasCoveredByPolicy/riskAssessments";
    const validator = getSubschemaValidator(path, schemaId);

    test("accepts lower-case 'External wall fire risk assessment'", () => {
      expect(
        validator({
          assessmentsCarriedOut: "External wall fire risk assessment",
        })
      ).toBe(true);
    });

    test("rejects mis-cased 'External Wall fire risk assessment'", () => {
      expect(
        validator({
          assessmentsCarriedOut: "External Wall fire risk assessment",
        })
      ).toBe(false);
    });
  });
});
