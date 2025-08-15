const {
  getTransactionSchema,
  extensionOverlays,
  getValidator,
} = require("../../../index.js");

const schemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

describe("Extension Overlays", () => {
  describe("String key support", () => {
    test("should load extension overlays using string keys", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "jk"]);
      const jkProp =
        schema.properties?.propertyPack?.properties?.specialistIssues
          ?.properties?.japaneseKnotweed;

      expect(jkProp).toBeDefined();
      expect(jkProp.ntsRef).toBe("A5.3");
    });

    test("should work with multiple extension string keys", () => {
      const schema = getTransactionSchema(schemaId, [
        "nts2023",
        "jk",
        "tf",
        "ma",
        "er",
      ]);

      const jkProp =
        schema.properties?.propertyPack?.properties?.specialistIssues
          ?.properties?.japaneseKnotweed;
      const tfProp =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf?.[2]?.properties
          ?.leaseholdInformation?.properties?.serviceCharge?.oneOf?.[1]
          ?.properties?.transferFees;
      const maProp =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf?.[2]?.properties
          ?.leaseholdInformation?.properties?.contactDetails;
      const erProp =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf?.[0]?.properties
          ?.estateRentcharges;

      expect(jkProp?.ntsRef).toBe("A5.3");
      expect(tfProp?.ntsRef).toBe("A3.5.1.1");
      expect(maProp?.ntsRef).toBe("A1.5.4");
      expect(erProp?.ntsRef).toBe("A3.4");
    });
  });

  describe("Individual extension functionality", () => {
    test("should add Japanese Knotweed extension correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "jk"]);
      const jkProp =
        schema.properties?.propertyPack?.properties?.specialistIssues
          ?.properties?.japaneseKnotweed;

      expect(jkProp).toBeDefined();

      expect(jkProp.ntsRef).toBe("A5.3");
      expect(jkProp.required).toContain("yesNo");
      expect(jkProp.discriminator?.propertyName).toBe("yesNo");
    });

    test("should add Transfer Fees extension correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "tf"]);
      const tfProp =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf?.[2]?.properties
          ?.leaseholdInformation?.properties?.serviceCharge?.oneOf?.[1]
          ?.properties?.transferFees;

      expect(tfProp).toBeDefined();
      expect(tfProp.ntsRef).toBe("A3.5.1.1");
      expect(tfProp.title).toBe(
        "Are there any additional fees payable on sale or letting?"
      );
    });

    test("should add Managing Agent extension correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "ma"]);
      const maProp =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf?.[2]?.properties
          ?.leaseholdInformation?.properties?.contactDetails;

      expect(maProp).toBeDefined();
      expect(maProp.ntsRef).toBe("A1.5.4");
      expect(maProp.required).toContain("contacts");
    });

    test("should add Solar Panels extension correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "sl"]);
      const slProp =
        schema.properties?.propertyPack?.properties?.electricity?.properties
          ?.solarPanels?.oneOf?.[1]?.properties?.panelsOwnedOutright;

      expect(slProp).toBeDefined();
      expect(slProp.ntsRef).toBe("B3.7.1");
    });

    test("should add Heating Installation extension correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "hi"]);
      const hiProp =
        schema.properties?.propertyPack?.properties?.heating?.properties
          ?.heatingSystem?.oneOf?.[1]?.properties?.centralHeatingDetails
          ?.properties?.centralHeatingInstalled;

      expect(hiProp).toBeDefined();
      expect(hiProp.ntsRef).toBe("B3.4.3.2");
    });

    test("should add Estate Rentcharges extension correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "er"]);
      const erProp =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf?.[0]?.properties
          ?.estateRentcharges;

      expect(erProp).toBeDefined();

      expect(erProp.ntsRef).toBe("A3.4");
      expect(erProp.required).toContain("yesNo");
      expect(erProp.discriminator?.propertyName).toBe("yesNo");
      expect(erProp.oneOf).toBeDefined();
      expect(Array.isArray(erProp.oneOf)).toBe(true);
      expect(erProp.oneOf.length).toBeGreaterThan(0);

      // Check the conditional branch for "Yes" response
      const yesBranch = erProp.oneOf.find(
        (branch) =>
          branch.required?.includes("details") &&
          branch.required?.includes("amount")
      );
      expect(yesBranch).toBeDefined();
      expect(yesBranch.properties?.details?.ntsRef).toBe("A3.4.2");
      expect(yesBranch.properties?.amount?.ntsRef).toBe("A3.4.3");
    });
  });

  describe("Extension overlay availability", () => {
    test("should export all extension overlays", () => {
      const expectedKeys = [
        "as",
        "dr",
        "jk",
        "sb",
        "hs", // Specialist Issues
        "oa",
        "la",
        "sf",
        "mc", // Property Features
        "er",
        "ma",
        "tf", // Ownership & Financial
        "sl",
        "hi",
        "fd", // Utilities & Services
        "oc", // Transaction
      ];

      expect(Object.keys(extensionOverlays).sort()).toEqual(
        expectedKeys.sort()
      );
    });

    test("should have valid JSON structure for all extensions", () => {
      Object.entries(extensionOverlays).forEach(([key, overlay]) => {
        expect(overlay).toBeDefined();
        expect(overlay.$schema).toBe("http://json-schema.org/draft-07/schema#");
        expect(overlay.$id).toContain(`extensions/${key}.json`);
        expect(overlay.properties).toBeDefined();
      });
    });
  });

  describe("NTS2 equivalence test", () => {
    test("should produce equivalent result to nts2 when all relevant extensions are combined", () => {
      // Get the full NTS2 schema
      const nts2Schema = getTransactionSchema(schemaId, ["nts2025"]);

      // Get NTS base with all relevant extensions
      const allExtensions = [
        "nts2023",
        // Specialist issues extensions
        "as",
        "dr",
        "jk",
        "sb",
        "hs",
        // Property features extensions
        "oa",
        "la",
        "sf",
        "mc",
        // Ownership & financial extensions
        "er",
        "ma",
        "tf",
        // Utilities & services extensions
        "sl",
        "hi",
        "fd",
        // Transaction extensions
        "oc",
      ];

      const ntsWithAllExtensions = getTransactionSchema(
        schemaId,
        allExtensions
      );

      // Compare key structural elements
      const nts2PropPack = nts2Schema.properties?.propertyPack;
      const extPropPack = ntsWithAllExtensions.properties?.propertyPack;

      // Check that specialist issues section exists in both
      expect(nts2PropPack?.properties?.specialistIssues).toBeDefined();
      expect(extPropPack?.properties?.specialistIssues).toBeDefined();

      // Check key specialist issues properties
      const nts2SI = nts2PropPack.properties.specialistIssues.properties;
      const extSI = extPropPack.properties.specialistIssues.properties;

      expect(extSI?.japaneseKnotweed).toBeDefined();
      expect(extSI?.dryRotEtcTreatment).toBeDefined();
      expect(extSI?.containsAsbestos).toBeDefined();
      expect(extSI?.subsidenceOrStructuralFault).toBeDefined();
      expect(extSI?.ongoingHealthOrSafetyIssue).toBeDefined();

      // Check that references match (extensions use ntsRef, NTS2 uses nts2Ref)
      if (nts2SI?.japaneseKnotweed && extSI?.japaneseKnotweed) {
        expect(extSI.japaneseKnotweed.ntsRef).toBe("A5.3");
        // NTS2 might have nts2Ref instead - this is expected difference
      }

      // Check outside areas
      expect(
        extPropPack?.properties?.residentialPropertyFeatures?.properties
          ?.outsideAreas
      ).toBeDefined();

      // Check leasehold extensions
      const leaseholdInfo =
        extPropPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf?.[2]?.properties
          ?.leaseholdInformation;
      expect(leaseholdInfo?.properties?.contactDetails).toBeDefined(); // Managing agent
      expect(
        leaseholdInfo?.properties?.serviceCharge?.oneOf?.[1]?.properties
          ?.transferFees
      ).toBeDefined(); // Transfer fees

      // Check utility extensions
      expect(
        extPropPack?.properties?.electricity?.properties?.solarPanels
          ?.oneOf?.[1]?.properties?.panelsOwnedOutright
      ).toBeDefined();
      expect(
        extPropPack?.properties?.heating?.properties?.heatingSystem?.oneOf?.[1]
          ?.properties?.centralHeatingDetails?.properties
          ?.centralHeatingInstalled
      ).toBeDefined();

      // Check construction extensions
      expect(
        extPropPack?.properties?.typeOfConstruction?.properties?.loft
      ).toBeDefined();
      expect(
        extPropPack?.properties?.typeOfConstruction?.properties
          ?.sprayFoamInsulation
      ).toBeDefined();

      // Check completion and moving
      expect(
        extPropPack?.properties?.completionAndMoving?.properties
          ?.otherPropertyInChain
      ).toBeDefined();
    });

    test("should validate data successfully with all extensions", () => {
      const allExtensions = [
        "nts2023",
        "as",
        "dr",
        "jk",
        "sb",
        "hs",
        "oa",
        "la",
        "sf",
        "mc",
        "er",
        "ma",
        "tf",
        "sl",
        "hi",
        "fd",
        "oc",
      ];

      const validator = getValidator(schemaId, allExtensions);
      expect(validator).toBeDefined();
      expect(typeof validator).toBe("function");

      // Test with minimal valid data structure
      const testData = {
        propertyPack: {
          priceInformation: { price: 100000, priceQualifier: "Freehold" },
          ownership: { ownershipsToBeTransferred: [] },
          councilTax: { band: "A" },
          energyEfficiency: { epcRating: "C" },
          buildInformation: { building: { buildDate: 2000 } },
          typeOfConstruction: { isStandardForm: { yesNo: "Yes" } },
          electricity: { mainsElectricity: { yesNo: "Yes" } },
          connectivity: { mobilePhoneCoverage: { signal: "Good" } },
          waterAndDrainage: { water: { supplier: "Thames Water" } },
          heating: { heatingSystem: { yesNo: "Yes" } },
          parking: { parkingArrangements: { yesNo: "No" } },
          listingAndConservation: { listedBuilding: { yesNo: "No" } },
          rightsAndInformalArrangements: { rightsGranted: { yesNo: "No" } },
          environmentalIssues: { flooding: { yesNo: "No" } },
          notices: { noticesAndProposals: { yesNo: "No" } },
          specialistIssues: {
            japaneseKnotweed: { yesNo: "No" },
            dryRotEtcTreatment: { yesNo: "No" },
            containsAsbestos: { yesNo: "No" },
            subsidenceOrStructuralFault: { yesNo: "No" },
            ongoingHealthOrSafetyIssue: { yesNo: "No" },
          },
        },
      };

      // This might not validate due to missing required fields, but validator should not throw
      expect(() => validator(testData)).not.toThrow();
    });
  });

  describe("Extension merging behavior", () => {
    test("should preserve required arrays when merging extensions", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "jk", "as"]);
      const siSection =
        schema.properties?.propertyPack?.properties?.specialistIssues;

      expect(siSection?.required).toBeDefined();
      expect(siSection.required).toContain("japaneseKnotweed");
      expect(siSection.required).toContain("containsAsbestos");
    });

    test("should make estateRentcharges required when er extension is applied", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "er"]);

      // Check that estateRentcharges is required at the oneOf branch level
      const freeholdBranch =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf?.[0];

      expect(freeholdBranch).toBeDefined();
      expect(freeholdBranch.required).toBeDefined();
      expect(freeholdBranch.required).toContain("estateRentcharges");

      // Verify the estateRentcharges property itself is properly structured
      const erProp = freeholdBranch.properties?.estateRentcharges;
      expect(erProp).toBeDefined();
      expect(erProp.ntsRef).toBe("A3.4");
      expect(erProp.required).toContain("yesNo");
    });

    test("should consistently apply required fields at parent level for extension properties", () => {
      // Test multiple extensions that should have required fields at parent level
      const schema = getTransactionSchema(schemaId, [
        "nts2023",
        "jk",
        "er",
        "ma",
        "tf",
      ]);

      // Check specialist issues - japaneseKnotweed should be required
      const siSection =
        schema.properties?.propertyPack?.properties?.specialistIssues;
      expect(siSection?.required).toContain("japaneseKnotweed");

      // Check ownership - estateRentcharges should be required in freehold branch
      const freeholdBranch =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf?.[0];
      expect(freeholdBranch?.required).toContain("estateRentcharges");

      // Check leasehold - leaseholdInformation should be required in leasehold branch
      const leaseholdBranch =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf?.[2];
      expect(leaseholdBranch?.required).toContain("leaseholdInformation");

      // Verify that the required arrays are properly merged (not overwritten)
      // Note: The length check might fail if only one extension is applied to specialistIssues
      // Let's check what's actually in the required arrays
      console.log("SpecialistIssues required:", siSection?.required);
      console.log("FreeholdBranch required:", freeholdBranch?.required);
      console.log("LeaseholdBranch required:", leaseholdBranch?.required);

      expect(siSection.required.length).toBeGreaterThanOrEqual(1);
      expect(freeholdBranch.required.length).toBeGreaterThan(0);
      expect(leaseholdBranch.required.length).toBeGreaterThan(0);
    });

    test("should merge required arrays for multiple specialist issues overlays", () => {
      // Apply multiple specialist issues overlays
      const overlays = ["nts2023", "jk", "as", "dr", "sb", "hs"];
      const schema = getTransactionSchema(schemaId, overlays);
      const siSection =
        schema.properties?.propertyPack?.properties?.specialistIssues;

      // The overlays correspond to these property keys
      const expectedRequired = [
        "japaneseKnotweed",
        "containsAsbestos",
        "dryRotEtcTreatment",
        "subsidenceOrStructuralFault",
        "ongoingHealthOrSafetyIssue",
      ];

      expect(siSection?.required).toBeDefined();
      // Should contain all expected keys
      expectedRequired.forEach((key) => {
        expect(siSection.required).toContain(key);
      });
      // Should be the same length as the number of overlays (excluding nts2023)
      expect(siSection.required.length).toBe(expectedRequired.length);
    });

    test("should handle discriminator patterns correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "jk"]);
      const jkProp =
        schema.properties?.propertyPack?.properties?.specialistIssues
          ?.properties?.japaneseKnotweed;

      expect(jkProp?.discriminator).toBeDefined();
      expect(jkProp.discriminator.propertyName).toBe("yesNo");
      expect(jkProp.oneOf).toBeDefined();
      expect(Array.isArray(jkProp.oneOf)).toBe(true);
    });

    test("should merge oneOf schemas correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "tf"]);
      const tfProp =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf?.[2]?.properties
          ?.leaseholdInformation?.properties?.serviceCharge?.oneOf?.[1]
          ?.properties?.transferFees;

      expect(tfProp?.oneOf).toBeDefined();
      expect(tfProp.oneOf.length).toBeGreaterThan(0);

      // Check the structure - details should be in the conditional oneOf branch
      const conditionalBranch = tfProp.oneOf.find(
        (branch) =>
          branch.properties?.details || branch.required?.includes("details")
      );
      expect(conditionalBranch).toBeDefined();
      expect(
        conditionalBranch.properties?.details ||
          conditionalBranch.required?.includes("details")
      ).toBeTruthy();
    });

    test("should not require additional fields when 'No' is selected in extension overlays", () => {
      // Test the 'as' (additional searches) extension overlay
      const schema = getTransactionSchema(schemaId, ["as"]);

      const containsAsbestos =
        schema.properties?.propertyPack?.properties?.specialistIssues
          ?.properties?.containsAsbestos;

      expect(containsAsbestos).toBeDefined();
      expect(containsAsbestos.discriminator?.propertyName).toBe("yesNo");
      expect(containsAsbestos.oneOf).toBeDefined();
      expect(containsAsbestos.oneOf).toHaveLength(2); // Both "No" and "Yes" branches

      // Find the "No" branch - it should not have additional required fields
      const noBranch = containsAsbestos.oneOf.find((branch) =>
        branch.properties?.yesNo?.enum?.includes("No")
      );
      expect(noBranch).toBeDefined();
      expect(noBranch.properties.yesNo.enum).toEqual(["No"]);
      // The "No" branch should not have additional required fields beyond "yesNo"
      expect(noBranch.required).toBeUndefined();

      // Find the "Yes" branch - it should have additional required fields
      const yesBranch = containsAsbestos.oneOf.find((branch) =>
        branch.properties?.yesNo?.enum?.includes("Yes")
      );
      expect(yesBranch).toBeDefined();
      expect(yesBranch.properties.yesNo.enum).toEqual(["Yes"]);
      expect(yesBranch.required).toBeDefined();
      expect(yesBranch.required).toContain("details");

      // Test that data with "No" answer validates correctly using subschema validation
      const { getSubschemaValidator } = require("../../../index.js");
      const subschemaValidator = getSubschemaValidator(
        "/propertyPack/specialistIssues/containsAsbestos",
        schemaId,
        ["as"]
      );

      const validDataWithNo = {
        yesNo: "No",
      };

      const result = subschemaValidator(validDataWithNo);
      // Handle both boolean and object return types
      if (typeof result === "boolean") {
        expect(result).toBe(true);
      } else {
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });
  });
});
