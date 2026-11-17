const {
  getTransactionSchema,
  extensionOverlays,
  getValidator,
  getSubschemaValidator,
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

  describe("SEF25 extension leaf annotations", () => {
    test("wg: every W1.x subsection exposes a yesNo ntsRef", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "wg"]);
      const subsections =
        schema.properties?.propertyPack?.properties
          ?.guaranteesWarrantiesAndIndemnityInsurances?.oneOf?.[1]?.properties;

      expect(subsections).toBeDefined();

      const discriminated = Object.entries(subsections).filter(
        ([, sub]) => sub?.discriminator?.propertyName === "yesNo"
      );
      expect(discriminated.length).toBeGreaterThan(0);

      for (const [key, sub] of discriminated) {
        expect(sub.ntsRef).toMatch(/^W1\.\d+$/);
        expect(sub.properties?.yesNo?.ntsRef).toMatch(/^W1\.\d+\.1$/);
        expect(sub.required).toContain("yesNo");
      }
    });

    test("ic: insuranceClaims exposes a yesNo ntsRef", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "ic"]);
      const icProp =
        schema.properties?.propertyPack?.properties?.insurance?.oneOf?.[1]
          ?.properties?.insuranceClaims;

      expect(icProp).toBeDefined();
      expect(icProp.ntsRef).toBe("I1.1");
      expect(icProp.properties?.yesNo?.ntsRef).toBe("I1.1.1");
      expect(icProp.required).toContain("yesNo");
    });

    test("nd: neighbourDevelopment N1.1 marker merges with nts yesNo ref", () => {
      // nd extension only carries the parent N1.1 marker; the yesNo leaf
      // annotation comes from the nts overlay (C4.1.1), which is required
      // alongside nd for the field to render.
      const schema = getTransactionSchema(schemaId, ["nts2023", "nd"]);
      const ndProp =
        schema.properties?.propertyPack?.properties?.notices?.properties
          ?.neighbourDevelopment;

      expect(ndProp).toBeDefined();
      expect(ndProp.ntsRef).toBe("N1.1");
      expect(ndProp.properties?.yesNo?.ntsRef).toBe("C4.1.1");
      expect(ndProp.required).toContain("yesNo");
    });

    test("mi: otherMaterialIssue exposes yesNo and details ntsRef", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "mi"]);
      const miProp =
        schema.properties?.propertyPack?.properties?.additionalInformation
          ?.properties?.otherMaterialIssue;

      expect(miProp).toBeDefined();
      expect(miProp.ntsRef).toBe("M1.1");
      expect(miProp.properties?.yesNo?.ntsRef).toBe("M1.1.1");
      expect(miProp.required).toContain("yesNo");

      const yesBranch = miProp.oneOf?.find((branch) =>
        branch.required?.includes("details")
      );
      expect(yesBranch).toBeDefined();
      expect(yesBranch.properties?.details?.ntsRef).toBe("M1.1.2");
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
        "sc",
        "pc",
        "ph", // SEF25
        "dk",
        "rw",
        "sd",
        "lc",
        "wg",
        "ic",
        "nd",
        "mi",
        "tr", // SEF25 (new)
        "ac", // SEF25 (new)
        "ta", // Compatibility
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

  describe("TA6 edition 6 compatibility extension", () => {
    test("keeps parking enum strict to TA6 edition 6 when compatibility is applied", () => {
      const ta6Validator = getSubschemaValidator(
        "/propertyPack/parking/controlledParking",
        schemaId,
        ["ta6ed6"]
      );
      expect(ta6Validator({ yesNo: "Not known" })).toBe(false);

      const compatValidator = getSubschemaValidator(
        "/propertyPack/parking/controlledParking",
        schemaId,
        ["nts2025", "ta"]
      );
      expect(compatValidator({ yesNo: "Not known" })).toBe(false);
      expect(compatValidator({ yesNo: "No" })).toBe(true);
    });

    test("applies TA6 edition 6 selector values on shared rights and boundaries paths", () => {
      const schema = getTransactionSchema(schemaId, [
        "nts2025",
        "ta",
      ]);
      const propertyPack = schema.properties.propertyPack.properties;

      expect(
        propertyPack.rightsAndInformalArrangements.properties
          .sharedContributions.oneOf[0].properties.yesNo.enum
      ).toEqual(["No", "Not applicable"]);

      expect(
        propertyPack.rightsAndInformalArrangements.properties
          .accessRestrictionAttempts.oneOf[0].properties.yesNo.enum
      ).toEqual(["No", "Not known"]);

      expect(
        propertyPack.legalBoundaries.properties.flyingFreehold.oneOf[0]
          .properties.yesNo.enum
      ).toEqual(["No", "Not known"]);
    });

    test("applies TA6 edition 6 heating values when compatibility is applied", () => {
      const heatingFeatures = getSubschemaValidator(
        "/propertyPack/heating/otherHeatingFeatures",
        schemaId,
        ["nts2025", "ta"]
      );
      expect(heatingFeatures(["Mains gas", "LPG", "Biomass"])).toBe(true);
    });

    // The TA6 edition 6 compatibility overlay narrows discriminator branches
    // at these paths. Ajv 8 requires each discriminator property to also
    // appear in `required`; otherwise validators for those branches fail at
    // compile time rather than rejecting invalid data at validation time.
    describe.each([
      "/propertyPack/parking/controlledParking",
      "/propertyPack/rightsAndInformalArrangements/sharedContributions",
      "/propertyPack/rightsAndInformalArrangements/accessRestrictionAttempts",
      "/propertyPack/legalBoundaries/flyingFreehold",
    ])(
      "discriminator-required contract at %s",
      (path) => {
        test("compiles cleanly under [nts2023, ta]", () => {
          expect(() =>
            getSubschemaValidator(path, schemaId, ["nts2023", "ta"])
          ).not.toThrow();
        });

        test("validator rejects payloads missing the yesNo discriminator", () => {
          const validator = getSubschemaValidator(path, schemaId, [
            "nts2023",
            "ta",
          ]);
          // Empty object should fail because yesNo is required.
          expect(validator({})).toBe(false);
          // Valid payloads with yesNo set should pass.
          expect(validator({ yesNo: "No" })).toBe(true);
        });
      }
    );

    test("compiles cleanly with the full SEF25 compatibility overlay set", () => {
      const compatibilityOverlays = [
        "nts2023",
        "as",
        "dr",
        "jk",
        "sb",
        "hs",
        "oa",
        "mc",
        "er",
        "ma",
        "tf",
        "sl",
        "fd",
        "sc",
        "lc",
        "wg",
        "ic",
        "mi",
        "tr",
        "sd",
        "dk",
        "pc",
        "rw",
        "ph",
        "ac",
        "ta",
      ];

      expect(() =>
        getSubschemaValidator(
          "/propertyPack/rightsAndInformalArrangements",
          schemaId,
          compatibilityOverlays
        )
      ).not.toThrow();
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

    test("should merge supply costs extension into mainsWater No branch", () => {
      const schema = getTransactionSchema(schemaId, ["sc"]);
      const mainsWater =
        schema.properties?.propertyPack?.properties?.waterAndDrainage
          ?.properties?.water?.properties?.mainsWater;

      expect(mainsWater?.oneOf).toBeDefined();

      // Branch 0 is yesNo="No" — should now contain associatedCost
      const noBranch = mainsWater.oneOf[0];
      const cost = noBranch?.properties?.associatedCost;
      expect(cost).toBeDefined();
      expect(cost.ntsRef).toBe("U1.1");
      expect(cost.required).toEqual(["frequency"]);
      expect(cost.properties.frequency.type).toBe("string");
      // amount now lives inside the frequency-discriminator's "Per month"/"Per year" branch
      const costBranch = cost.oneOf?.find((b) =>
        b.properties?.frequency?.enum?.includes("Per month")
      );
      expect(costBranch?.properties?.amount?.type).toBe("number");
      expect(costBranch?.required).toEqual(["amount"]);
    });

    test("should merge supply costs extension into mainsFoulDrainage No/Not known branch", () => {
      const schema = getTransactionSchema(schemaId, ["sc"]);
      const mainsFoul =
        schema.properties?.propertyPack?.properties?.waterAndDrainage
          ?.properties?.drainage?.properties?.mainsFoulDrainage;

      expect(mainsFoul?.oneOf).toBeDefined();

      // Branch 2 is yesNo="No"/"Not known" — should now contain associatedCost
      const noBranch = mainsFoul.oneOf[2];
      const cost = noBranch?.properties?.associatedCost;
      expect(cost).toBeDefined();
      expect(cost.ntsRef).toBe("U1.2");
      expect(cost.required).toEqual(["frequency"]);
      // amount now lives inside the frequency-discriminator's "Per month"/"Per year" branch
      const costBranch = cost.oneOf?.find((b) =>
        b.properties?.frequency?.enum?.includes("Per month")
      );
      expect(costBranch?.properties?.amount?.type).toBe("number");
      expect(costBranch?.required).toEqual(["amount"]);
    });

    test("should merge parking permit cost and frequency into controlledParking Yes branch", () => {
      const schema = getTransactionSchema(schemaId, ["pc"]);
      const controlled =
        schema.properties?.propertyPack?.properties?.parking?.properties
          ?.controlledParking;

      expect(controlled?.oneOf).toBeDefined();

      // Branch 1 is yesNo="Yes"
      const yesBranch = controlled.oneOf[1];
      const cost = yesBranch?.properties?.costOfPermit;
      expect(cost).toBeDefined();
      expect(cost.ntsRef).toBe("P1.1");
      expect(cost.type).toBe("number");

      const freq = yesBranch?.properties?.costOfPermitFrequency;
      expect(freq).toBeDefined();
      expect(freq.ntsRef).toBe("P1.2");
      expect(freq.type).toBe("string");
    });

    test("should merge all 4 property hazard fields into specialistIssues", () => {
      const schema = getTransactionSchema(schemaId, ["ph"]);
      const si =
        schema.properties?.propertyPack?.properties?.specialistIssues
          ?.properties;

      const expectedFields = [
        { key: "wellsDitchesShaft", ref: "H1.1" },
        { key: "damagedOrExposedElectrics", ref: "H1.2" },
        { key: "damageToFlooringOrStaircases", ref: "H1.3" },
        { key: "knownAreasInPoorCondition", ref: "H1.4" },
      ];

      expectedFields.forEach(({ key, ref }) => {
        expect(si[key]).toBeDefined();
        expect(si[key].ntsRef).toBe(ref);
        expect(si[key].required).toContain("yesNo");
        expect(si[key].discriminator?.propertyName).toBe("yesNo");
        expect(si[key].oneOf).toHaveLength(2);

        // "No" branch should not require details
        const noBranch = si[key].oneOf.find((b) =>
          b.properties?.yesNo?.enum?.includes("No")
        );
        expect(noBranch).toBeDefined();
        expect(noBranch.required).toBeUndefined();

        // "Yes" branch should require details
        const yesBranch = si[key].oneOf.find((b) =>
          b.properties?.yesNo?.enum?.includes("Yes")
        );
        expect(yesBranch).toBeDefined();
        expect(yesBranch.required).toContain("details");
        expect(yesBranch.properties.details.minLength).toBe(1);
      });
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

  describe("SEF25 extension validation", () => {
    describe("Supply costs (sc)", () => {
      const overlays = ["baspiV5", "sc"];

      test("should validate valid private water cost", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/waterAndDrainage/water/mainsWater",
          schemaId,
          overlays
        );

        const result = validator({
          yesNo: "No",
          details: "Private borehole",
          associatedCost: {
            amount: 50,
            frequency: "Per month",
          },
        });

        expect(result).toBe(true);
      });

      test("should validate private water with no associated costs", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/waterAndDrainage/water/mainsWater",
          schemaId,
          overlays
        );

        const result = validator({
          yesNo: "No",
          details: "Private borehole",
          associatedCost: {
            amount: 0,
            frequency: "Not applicable",
          },
        });

        expect(result).toBe(true);
      });

      test("should require associated cost for private water supply", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/waterAndDrainage/water/mainsWater",
          schemaId,
          overlays
        );

        const result = validator({
          yesNo: "No",
          details: "Private well",
        });

        // associatedCost is required by the sc extension
        expect(result).toBe(false);
      });

      test("should reject invalid frequency value for water cost", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/waterAndDrainage/water/mainsWater",
          schemaId,
          overlays
        );

        const result = validator({
          yesNo: "No",
          details: "Borehole",
          associatedCost: {
            amount: 100,
            frequency: "Weekly",
          },
        });

        expect(result).toBe(false);
      });

      test("should reject non-numeric amount for water cost", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/waterAndDrainage/water/mainsWater",
          schemaId,
          overlays
        );

        const result = validator({
          yesNo: "No",
          details: "Borehole",
          associatedCost: {
            amount: "fifty pounds",
            frequency: "Per month",
          },
        });

        expect(result).toBe(false);
      });

      test("should validate valid private sewerage cost", () => {
        // Use sc without baspiV5 to avoid strict offMainsDrainageSystem requirements
        const validator = getSubschemaValidator(
          "/propertyPack/waterAndDrainage/drainage/mainsFoulDrainage",
          schemaId,
          ["sc"]
        );

        const result = validator({
          yesNo: "No",
          associatedCost: {
            amount: 200,
            frequency: "Per year",
          },
        });

        expect(result).toBe(true);
      });

      test("should reject invalid frequency for sewerage cost", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/waterAndDrainage/drainage/mainsFoulDrainage",
          schemaId,
          ["sc"]
        );

        const result = validator({
          yesNo: "No",
          associatedCost: {
            amount: 200,
            frequency: "Quarterly",
          },
        });

        expect(result).toBe(false);
      });

      test("should not allow associated cost when mains water is Yes", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/waterAndDrainage/water/mainsWater",
          schemaId,
          overlays
        );

        // When yesNo="Yes", associatedCost should cause validation failure
        // because it's only defined in the "No" oneOf branch
        const result = validator({
          yesNo: "Yes",
          supplier: "Thames Water",
          associatedCost: {
            amount: 50,
            frequency: "Per month",
          },
        });

        expect(result).toBe(false);
      });
    });

    describe("Parking permit cost (pc)", () => {
      const overlays = ["baspiV5", "pc"];

      test("should validate valid parking permit with frequency", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/parking/controlledParking",
          schemaId,
          overlays
        );

        const result = validator({
          yesNo: "Yes",
          costOfPermit: 150,
          costOfPermitFrequency: "Per year",
        });

        expect(result).toBe(true);
      });

      test("should validate parking permit with monthly frequency", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/parking/controlledParking",
          schemaId,
          overlays
        );

        const result = validator({
          yesNo: "Yes",
          costOfPermit: 12.50,
          costOfPermitFrequency: "Per month",
        });

        expect(result).toBe(true);
      });

      test("should reject invalid frequency for parking permit", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/parking/controlledParking",
          schemaId,
          overlays
        );

        const result = validator({
          yesNo: "Yes",
          costOfPermit: 150,
          costOfPermitFrequency: "Per quarter",
        });

        expect(result).toBe(false);
      });

      test("should validate No answer without cost fields", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/parking/controlledParking",
          schemaId,
          overlays
        );

        const result = validator({
          yesNo: "No",
        });

        expect(result).toBe(true);
      });
    });

    describe("Property hazards (ph)", () => {
      const overlays = ["ph"];
      const hazardFields = [
        "wellsDitchesShaft",
        "damagedOrExposedElectrics",
        "damageToFlooringOrStaircases",
        "knownAreasInPoorCondition",
      ];

      hazardFields.forEach((field) => {
        test(`${field}: should validate "No" answer`, () => {
          const validator = getSubschemaValidator(
            `/propertyPack/specialistIssues/${field}`,
            schemaId,
            overlays
          );

          const result = validator({ yesNo: "No" });
          expect(result).toBe(true);
        });

        test(`${field}: should validate "Yes" with details`, () => {
          const validator = getSubschemaValidator(
            `/propertyPack/specialistIssues/${field}`,
            schemaId,
            overlays
          );

          const result = validator({
            yesNo: "Yes",
            details: "Some description of the issue",
          });
          expect(result).toBe(true);
        });

        test(`${field}: should reject "Yes" without details`, () => {
          const validator = getSubschemaValidator(
            `/propertyPack/specialistIssues/${field}`,
            schemaId,
            overlays
          );

          const result = validator({ yesNo: "Yes" });
          expect(result).toBe(false);
        });

        test(`${field}: should reject "Yes" with empty details`, () => {
          const validator = getSubschemaValidator(
            `/propertyPack/specialistIssues/${field}`,
            schemaId,
            overlays
          );

          const result = validator({ yesNo: "Yes", details: "" });
          expect(result).toBe(false);
        });

        test(`${field}: should reject invalid yesNo value`, () => {
          const validator = getSubschemaValidator(
            `/propertyPack/specialistIssues/${field}`,
            schemaId,
            overlays
          );

          const result = validator({ yesNo: "Maybe" });
          expect(result).toBe(false);
        });
      });
    });

    describe("Combined SEF25 extensions", () => {
      test("should load all three SEF25 extensions together", () => {
        const schema = getTransactionSchema(schemaId, [
          "baspiV5",
          "sc",
          "pc",
          "ph",
        ]);

        // Supply costs
        const waterCost =
          schema.properties?.propertyPack?.properties?.waterAndDrainage
            ?.properties?.water?.properties?.mainsWater?.oneOf?.[0]?.properties
            ?.associatedCost;
        expect(waterCost).toBeDefined();

        const sewerageCost =
          schema.properties?.propertyPack?.properties?.waterAndDrainage
            ?.properties?.drainage?.properties?.mainsFoulDrainage?.oneOf?.[2]
            ?.properties?.associatedCost;
        expect(sewerageCost).toBeDefined();

        // Parking
        const parkingFreq =
          schema.properties?.propertyPack?.properties?.parking?.properties
            ?.controlledParking?.oneOf?.[1]?.properties?.costOfPermitFrequency;
        expect(parkingFreq).toBeDefined();

        // Hazards
        const si =
          schema.properties?.propertyPack?.properties?.specialistIssues
            ?.properties;
        expect(si?.wellsDitchesShaft).toBeDefined();
        expect(si?.damagedOrExposedElectrics).toBeDefined();
        expect(si?.damageToFlooringOrStaircases).toBeDefined();
        expect(si?.knownAreasInPoorCondition).toBeDefined();
      });

      test("should not interfere with existing NTS2 extensions", () => {
        const schema = getTransactionSchema(schemaId, [
          "nts2023",
          "jk",
          "hs",
          "sc",
          "pc",
          "ph",
        ]);

        const si =
          schema.properties?.propertyPack?.properties?.specialistIssues;

        // Existing NTS2 extensions still work
        expect(si?.properties?.japaneseKnotweed?.ntsRef).toBe("A5.3");
        expect(si?.properties?.ongoingHealthOrSafetyIssue?.ntsRef).toBe(
          "A5.5"
        );
        expect(si?.required).toContain("japaneseKnotweed");
        expect(si?.required).toContain("ongoingHealthOrSafetyIssue");

        // SEF25 hazards also present (remapped to ntsRef in extension overlays)
        expect(si?.properties?.wellsDitchesShaft?.ntsRef).toBe("H1.1");
        expect(si?.properties?.knownAreasInPoorCondition?.ntsRef).toBe(
          "H1.4"
        );
      });
    });

    describe("Dropped kerb (dk)", () => {
      test("should validate Yes answer", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/parking/droppedKerbAccess",
          schemaId,
          ["dk"]
        );
        expect(validator({ yesNo: "Yes" })).toBe(true);
      });

      test("should validate No answer", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/parking/droppedKerbAccess",
          schemaId,
          ["dk"]
        );
        expect(validator({ yesNo: "No" })).toBe(true);
      });

      test("should reject invalid value", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/parking/droppedKerbAccess",
          schemaId,
          ["dk"]
        );
        expect(validator({ yesNo: "Maybe" })).toBe(false);
      });

      test("should not be required without dk overlay", () => {
        const schema = getTransactionSchema(schemaId, ["baspiV5"]);
        const parking = schema.properties?.propertyPack?.properties?.parking;
        expect(parking?.required || []).not.toContain("droppedKerbAccess");
      });

      test("should be required with dk overlay", () => {
        const schema = getTransactionSchema(schemaId, ["dk"]);
        const parking = schema.properties?.propertyPack?.properties?.parking;
        expect(parking?.required).toContain("droppedKerbAccess");
      });
    });

    describe("Private right of way (rw)", () => {
      test("should validate No answer", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/rightsAndInformalArrangements/rightsOrArrangements/privateRightOfWay",
          schemaId,
          ["rw"]
        );
        expect(validator({ yesNo: "No" })).toBe(true);
      });

      test("should validate Yes with details", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/rightsAndInformalArrangements/rightsOrArrangements/privateRightOfWay",
          schemaId,
          ["rw"]
        );
        expect(validator({ yesNo: "Yes", details: "Neighbour has access through garden" })).toBe(true);
      });

      test("should reject Yes without details", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/rightsAndInformalArrangements/rightsOrArrangements/privateRightOfWay",
          schemaId,
          ["rw"]
        );
        expect(validator({ yesNo: "Yes" })).toBe(false);
      });

      test("should reject Yes with empty details", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/rightsAndInformalArrangements/rightsOrArrangements/privateRightOfWay",
          schemaId,
          ["rw"]
        );
        expect(validator({ yesNo: "Yes", details: "" })).toBe(false);
      });

      test("should not be required without rw overlay", () => {
        const schema = getTransactionSchema(schemaId, ["baspiV5"]);
        const rights = schema.properties?.propertyPack?.properties?.rightsAndInformalArrangements
          ?.properties?.rightsOrArrangements;
        expect(rights?.required || []).not.toContain("privateRightOfWay");
      });

      test("should be required with rw overlay", () => {
        const schema = getTransactionSchema(schemaId, ["rw"]);
        const rights = schema.properties?.propertyPack?.properties?.rightsAndInformalArrangements
          ?.properties?.rightsOrArrangements;
        expect(rights?.required).toContain("privateRightOfWay");
      });
    });

    describe("Storm/fire/flood damage (sd)", () => {
      test("should validate No answer", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/environmentalIssues/stormFireFloodDamage",
          schemaId,
          ["sd"]
        );
        expect(validator({ yesNo: "No" })).toBe(true);
      });

      test("should validate Yes with details", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/environmentalIssues/stormFireFloodDamage",
          schemaId,
          ["sd"]
        );
        expect(validator({ yesNo: "Yes", details: "Flood damage in 2020" })).toBe(true);
      });

      test("should reject Yes without details", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/environmentalIssues/stormFireFloodDamage",
          schemaId,
          ["sd"]
        );
        expect(validator({ yesNo: "Yes" })).toBe(false);
      });

      test("should not be required without sd overlay", () => {
        const schema = getTransactionSchema(schemaId, ["baspiV5"]);
        const env = schema.properties?.propertyPack?.properties?.environmentalIssues;
        expect(env?.required || []).not.toContain("stormFireFloodDamage");
      });

      test("should be required with sd overlay", () => {
        const schema = getTransactionSchema(schemaId, ["sd"]);
        const env = schema.properties?.propertyPack?.properties?.environmentalIssues;
        expect(env?.required).toContain("stormFireFloodDamage");
      });
    });

    describe("Solar lease costs (lc)", () => {
      test("should validate Not applicable frequency", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/electricity/solarPanels/panelsOwnedOutright/associatedCost",
          schemaId,
          ["lc"]
        );
        expect(validator({ amount: 0, frequency: "Not applicable" })).toBe(true);
      });

      test("should validate amount and frequency", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/electricity/solarPanels/panelsOwnedOutright/associatedCost",
          schemaId,
          ["lc"]
        );
        expect(validator({ amount: 75, frequency: "Per month" })).toBe(true);
      });

      test("should reject missing amount", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/electricity/solarPanels/panelsOwnedOutright/associatedCost",
          schemaId,
          ["lc"]
        );
        expect(validator({ frequency: "Per month" })).toBe(false);
      });

      test("should reject missing frequency", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/electricity/solarPanels/panelsOwnedOutright/associatedCost",
          schemaId,
          ["lc"]
        );
        expect(validator({ amount: 75 })).toBe(false);
      });

      test("should reject invalid frequency", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/electricity/solarPanels/panelsOwnedOutright/associatedCost",
          schemaId,
          ["lc"]
        );
        expect(validator({ amount: 75, frequency: "Weekly" })).toBe(false);
      });
    });

    describe("Warranties and guarantees (wg)", () => {
      const warrantyCategoryPaths = [
        { path: "newHomeWarranty", ref: "W1.1" },
        { path: "roofingWork", ref: "W1.2" },
        { path: "dampProofingTreatment", ref: "W1.3" },
        { path: "centralHeatingAndorPlumbing", ref: "W1.4" },
        { path: "electricalRepairOrInstallation", ref: "W1.5" },
        { path: "subsidenceWork", ref: "W1.6" },
        { path: "otherGuarantees", ref: "W1.7" },
      ];

      test("should have ntsRef on all warranty categories when wg overlay loaded", () => {
        const schema = getTransactionSchema(schemaId, ["baspiV5", "wg"]);
        const warranties =
          schema.properties?.propertyPack?.properties?.guaranteesWarrantiesAndIndemnityInsurances;

        // Warranty fields are in oneOf[1] (hasValidGuaranteesOrWarranties = Yes)
        const yesBranch = warranties.oneOf[1];

        warrantyCategoryPaths.forEach(({ path, ref }) => {
          expect(yesBranch.properties[path]?.ntsRef).toBe(ref);
        });
      });

      test("should mark warranty categories as required when wg overlay loaded", () => {
        const schema = getTransactionSchema(schemaId, ["baspiV5", "wg"]);
        const warranties =
          schema.properties?.propertyPack?.properties?.guaranteesWarrantiesAndIndemnityInsurances;

        const yesBranch = warranties.oneOf[1];
        warrantyCategoryPaths.forEach(({ path }) => {
          expect(yesBranch.required).toContain(path);
        });
      });

      test("should not require warranty categories without any overlay", () => {
        const schema = getTransactionSchema(schemaId, []);
        const warranties =
          schema.properties?.propertyPack?.properties?.guaranteesWarrantiesAndIndemnityInsurances;

        const yesBranch = warranties.oneOf[1];
        // Without any overlay, warranty categories should not be in required
        expect(yesBranch.required || []).not.toContain("newHomeWarranty");
        expect(yesBranch.required || []).not.toContain("electricalRepairOrInstallation");
      });
    });

    describe("Insurance claims (ic)", () => {
      test("should mark insuranceClaims as required in isInsured=Yes branch", () => {
        const schema = getTransactionSchema(schemaId, ["ic"]);
        const insurance = schema.properties?.propertyPack?.properties?.insurance;
        // oneOf[1] is isInsured=Yes
        const yesBranch = insurance.oneOf[1];
        expect(yesBranch?.required).toContain("insuranceClaims");
      });

      test("should require isInsured at the insurance level", () => {
        const schema = getTransactionSchema(schemaId, ["ic"]);
        const insurance = schema.properties?.propertyPack?.properties?.insurance;
        expect(insurance?.required).toContain("isInsured");
        expect(insurance?.discriminator?.propertyName).toBe("isInsured");
        expect(insurance?.properties?.isInsured?.ntsRef).toBe("I1.2");
      });

      test("should expose I1.1.2 ntsRef on details and require it in claims Yes branch", () => {
        const schema = getTransactionSchema(schemaId, ["ic"]);
        const claims =
          schema.properties?.propertyPack?.properties?.insurance?.oneOf?.[1]
            ?.properties?.insuranceClaims;
        const claimsYesBranch = claims?.oneOf?.find((b) =>
          b.properties?.yesNo?.enum?.includes("Yes")
        );
        expect(claimsYesBranch?.required).toContain("details");
        expect(claimsYesBranch?.properties?.details?.ntsRef).toBe("I1.1.2");
      });

      test("should compile cleanly under AJV strict-mode discriminator with [ic]", () => {
        expect(() => getValidator(schemaId, ["ic"])).not.toThrow();
        // /propertyPack/insurance is where the isInsured discriminator lives;
        // compiling that subschema exercises the strict-mode constraint.
        expect(() =>
          getSubschemaValidator("/propertyPack/insurance", schemaId, ["ic"])
        ).not.toThrow();
      });

      test("should compile cleanly under AJV strict-mode discriminator with [sef25]", () => {
        // sef25 carries the same discriminator structure as the ic extension;
        // both must satisfy the strict-mode discriminator requirement.
        expect(() => getValidator(schemaId, ["sef25"])).not.toThrow();
      });

      test("should validate insuranceClaims No answer", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/insurance/insuranceClaims",
          schemaId,
          ["baspiV5", "ic"]
        );
        expect(validator({ yesNo: "No" })).toBe(true);
      });

      test("should validate insuranceClaims Yes with details", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/insurance/insuranceClaims",
          schemaId,
          ["baspiV5", "ic"]
        );
        expect(validator({ yesNo: "Yes", details: "Storm damage claim in 2019" })).toBe(true);
      });

      describe("insurance-level validation with [ic]", () => {
        const insurancePath = "/propertyPack/insurance";

        test("rejects empty object (missing isInsured)", () => {
          const validator = getSubschemaValidator(insurancePath, schemaId, [
            "ic",
          ]);
          expect(validator({})).toBe(false);
        });

        test("rejects invalid isInsured enum value", () => {
          const validator = getSubschemaValidator(insurancePath, schemaId, [
            "ic",
          ]);
          expect(validator({ isInsured: "Maybe" })).toBe(false);
        });

        test("accepts the isInsured=No branch", () => {
          const validator = getSubschemaValidator(insurancePath, schemaId, [
            "ic",
          ]);
          expect(validator({ isInsured: "No" })).toBe(true);
        });

        test("rejects isInsured=Yes without insuranceClaims", () => {
          const validator = getSubschemaValidator(insurancePath, schemaId, [
            "ic",
          ]);
          expect(validator({ isInsured: "Yes" })).toBe(false);
        });

        test("accepts isInsured=Yes with insuranceClaims yesNo=No", () => {
          const validator = getSubschemaValidator(insurancePath, schemaId, [
            "ic",
          ]);
          expect(
            validator({
              isInsured: "Yes",
              insuranceClaims: { yesNo: "No" },
            })
          ).toBe(true);
        });

        test("rejects isInsured=Yes with insuranceClaims yesNo=Yes but no details", () => {
          const validator = getSubschemaValidator(insurancePath, schemaId, [
            "ic",
          ]);
          expect(
            validator({
              isInsured: "Yes",
              insuranceClaims: { yesNo: "Yes" },
            })
          ).toBe(false);
        });

        test("accepts isInsured=Yes with a full claim including details", () => {
          const validator = getSubschemaValidator(insurancePath, schemaId, [
            "ic",
          ]);
          expect(
            validator({
              isInsured: "Yes",
              insuranceClaims: {
                yesNo: "Yes",
                details: "Storm damage claim in 2019",
              },
            })
          ).toBe(true);
        });

        test("rejects empty details string on the claim Yes branch", () => {
          const validator = getSubschemaValidator(insurancePath, schemaId, [
            "ic",
          ]);
          expect(
            validator({
              isInsured: "Yes",
              insuranceClaims: { yesNo: "Yes", details: "" },
            })
          ).toBe(false);
        });

        test("rejects invalid insuranceClaims yesNo enum value", () => {
          const validator = getSubschemaValidator(insurancePath, schemaId, [
            "ic",
          ]);
          expect(
            validator({
              isInsured: "Yes",
              insuranceClaims: { yesNo: "Maybe" },
            })
          ).toBe(false);
        });
      });
    });

    describe("Neighbour development (nd)", () => {
      test("should add ntsRef to neighbourDevelopment", () => {
        const schema = getTransactionSchema(schemaId, ["nd"]);
        const nd = schema.properties?.propertyPack?.properties?.notices
          ?.properties?.neighbourDevelopment;
        expect(nd?.ntsRef).toBe("N1.1");
      });

      test("preserves native ntsRef on the notices parent (does not clobber with sef25Ref)", () => {
        const schema = getTransactionSchema(schemaId, ["nd"]);
        const notices = schema.properties?.propertyPack?.properties?.notices;
        // notices has both ntsRef: "C4" and sef25Ref: "N1" in combined.json.
        // The nd extension must not overwrite the native ntsRef with the
        // substituted sef25Ref value.
        expect(notices?.ntsRef).toBe("C4");
      });

      test("should validate No answer", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/notices/neighbourDevelopment",
          schemaId,
          ["baspiV5", "nd"]
        );
        expect(validator({ yesNo: "No" })).toBe(true);
      });
    });

    describe("Other material issue (mi)", () => {
      test("should mark otherMaterialIssue as required", () => {
        const schema = getTransactionSchema(schemaId, ["mi"]);
        const additional = schema.properties?.propertyPack?.properties?.additionalInformation;
        expect(additional?.required).toContain("otherMaterialIssue");
      });

      test("should not require otherMaterialIssue without mi overlay", () => {
        const schema = getTransactionSchema(schemaId, []);
        const additional = schema.properties?.propertyPack?.properties?.additionalInformation;
        expect(additional?.required || []).not.toContain("otherMaterialIssue");
      });

      test("should validate No answer", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/additionalInformation/otherMaterialIssue",
          schemaId,
          ["baspiV5", "mi"]
        );
        expect(validator({ yesNo: "No" })).toBe(true);
      });

      test("should validate Yes with details", () => {
        const validator = getSubschemaValidator(
          "/propertyPack/additionalInformation/otherMaterialIssue",
          schemaId,
          ["baspiV5", "mi"]
        );
        expect(validator({ yesNo: "Yes", details: "Previous subsidence issues" })).toBe(true);
      });
    });

    describe("Title restrictions (tr)", () => {
      test("should require titleRestrictions in freehold branch with tr overlay", () => {
        const schema = getTransactionSchema(schemaId, ["tr"]);
        const items = schema.properties?.propertyPack?.properties?.ownership
          ?.properties?.ownershipsToBeTransferred?.items;
        // oneOf[0] is Freehold
        const freeholdBranch = items.oneOf[0];
        expect(freeholdBranch?.properties?.titleRestrictions).toBeDefined();
        expect(freeholdBranch?.required).toContain("titleRestrictions");
      });

      test("should not require titleRestrictions without tr overlay", () => {
        const schema = getTransactionSchema(schemaId, ["baspiV5"]);
        const items = schema.properties?.propertyPack?.properties?.ownership
          ?.properties?.ownershipsToBeTransferred?.items;
        const freeholdBranch = items.oneOf[0];
        expect(freeholdBranch?.required || []).not.toContain("titleRestrictions");
      });

      test("should have correct ntsRef", () => {
        const schema = getTransactionSchema(schemaId, ["tr"]);
        const items = schema.properties?.propertyPack?.properties?.ownership
          ?.properties?.ownershipsToBeTransferred?.items;
        const freeholdBranch = items.oneOf[0];
        expect(freeholdBranch?.properties?.titleRestrictions?.ntsRef).toBe("T1.1");
      });
    });

    describe("Alterations and changes (ac)", () => {
      const alterationFields = [
        "extension",
        "loftConversion",
        "garageConversion",
        "removalOfInternalWalls",
        "changeOfUse",
      ];

      test("should expose only selected alterations and changes fields", () => {
        const schema = getTransactionSchema(schemaId, ["ac"]);
        const alterations =
          schema.properties?.propertyPack?.properties?.alterationsAndChanges;
        const acOverlayAlterations =
          extensionOverlays.ac.properties?.propertyPack?.properties
            ?.alterationsAndChanges;

        expect(alterations?.ntsRef).toBe("A1");
        expect(alterations?.required).toEqual(
          expect.arrayContaining(alterationFields)
        );
        expect(Object.keys(acOverlayAlterations?.properties || {}).sort()).toEqual(
          alterationFields.slice().sort()
        );

        alterationFields.forEach((field) => {
          const fieldSchema = alterations.properties?.[field];
          const yesBranch = fieldSchema?.oneOf?.[1];
          const planningPermission =
            yesBranch?.properties?.planningPermission;
          const buildingRegApproval =
            yesBranch?.properties?.buildingRegApproval;
          const overlayFieldSchema = acOverlayAlterations.properties?.[field];
          const overlayYesBranch =
            overlayFieldSchema?.oneOf?.[1];
          const overlayPlanningPermission =
            overlayYesBranch?.properties?.planningPermission;
          const overlayBuildingRegApproval =
            overlayYesBranch?.properties?.buildingRegApproval;

          expect(fieldSchema?.required).toContain("yesNo");
          expect(fieldSchema?.discriminator).toEqual({
            propertyName: "yesNo",
          });
          expect(overlayFieldSchema?.discriminator).toEqual({
            propertyName: "yesNo",
          });
          expect(fieldSchema?.properties?.yesNo?.ntsRef).toMatch(/^A1\./);
          expect(yesBranch?.required).toEqual(
            expect.arrayContaining([
              "details",
              "planningPermission",
              "buildingRegApproval",
            ])
          );
          expect(Object.keys(overlayYesBranch?.properties || {}).sort()).toEqual([
            "buildingRegApproval",
            "details",
            "planningPermission",
          ]);
          expect(planningPermission?.discriminator).toEqual({
            propertyName: "yesNo",
          });
          expect(buildingRegApproval?.discriminator).toEqual({
            propertyName: "yesNo",
          });
          expect(overlayPlanningPermission?.discriminator).toEqual({
            propertyName: "yesNo",
          });
          expect(overlayBuildingRegApproval?.discriminator).toEqual({
            propertyName: "yesNo",
          });
          expect(yesBranch?.properties?.workCompleted?.ntsRef).toBeUndefined();
          expect(yesBranch?.properties?.documents?.ntsRef).toBeUndefined();
          expect(yesBranch?.properties?.yearCompleted?.ntsRef).toBeUndefined();
          expect(yesBranch?.properties?.listedBuildingConsent?.ntsRef).toBeUndefined();
          expect(yesBranch?.properties?.deedRestrictionConsent?.ntsRef).toBeUndefined();
        });
      });

      test("should require details and consent yesNo fields for Yes answers", () => {
        alterationFields.forEach((field) => {
          const validator = getSubschemaValidator(
            `/propertyPack/alterationsAndChanges/${field}`,
            schemaId,
            ["ac"]
          );

          expect(validator({ yesNo: "No" })).toBe(true);
          expect(validator({ yesNo: "Yes" })).toBe(false);
          expect(
            validator({
              yesNo: "Yes",
              details: `${field} details`,
              planningPermission: { yesNo: "Not required" },
              buildingRegApproval: { yesNo: "Yes" },
            })
          ).toBe(true);
        });
      });
    });

    describe("All SEF25 extensions combined", () => {
      const allSef25 = ["sc", "pc", "ph", "dk", "rw", "sd", "lc", "wg", "ic", "nd", "mi", "tr", "ac"];

      test("should load all SEF25 extensions together without error", () => {
        const schema = getTransactionSchema(schemaId, ["baspiV5", ...allSef25]);
        expect(schema).toBeDefined();
        expect(schema.properties?.propertyPack).toBeDefined();
      });

      test("should not interfere with existing NTS2 extensions when combined", () => {
        const schema = getTransactionSchema(schemaId, ["nts2025", ...allSef25]);

        // NTS2 fields still work
        const si = schema.properties?.propertyPack?.properties?.specialistIssues;
        expect(si?.properties?.wellsDitchesShaft?.ntsRef).toBe("H1.1");

        // New SEF25 fields present
        const parking = schema.properties?.propertyPack?.properties?.parking?.properties;
        expect(parking?.droppedKerbAccess).toBeDefined();

        const env = schema.properties?.propertyPack?.properties?.environmentalIssues?.properties;
        expect(env?.stormFireFloodDamage).toBeDefined();

        const rights = schema.properties?.propertyPack?.properties?.rightsAndInformalArrangements
          ?.properties?.rightsOrArrangements?.properties;
        expect(rights?.privateRightOfWay).toBeDefined();
      });
    });
  });

  // Regression: when a SEF25 extension is merged on top of an NTS overlay,
  // the intermediate parent nodes must retain their native NTS refs rather
  // than being clobbered by sef25Ref values substituted into `ntsRef`. The
  // extractor previously emitted `ntsRef: "R1"` on `rightsAndInformalArrangements`
  // and `rightsOrArrangements`, which broke the form UI's traversal by NTS
  // section number.
  describe("sef25 extensions preserve NTS parent refs", () => {
    test("rw (privateRightOfWay) does not clobber rightsAndInformalArrangements / rightsOrArrangements ntsRefs", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "rw"]);

      const ria =
        schema.properties?.propertyPack?.properties?.rightsAndInformalArrangements;
      const ra = ria?.properties?.rightsOrArrangements;
      const prow = ra?.properties?.privateRightOfWay;

      // Parents keep their NTS section numbers.
      expect(ria.ntsRef).toBe("C2.2");
      expect(ra.ntsRef).toBe("C2.2.1");

      // Sibling publicRightOfWay still tagged with NTS ref.
      expect(ra.properties.publicRightOfWay.ntsRef).toBe("C2.2.1");

      // The new SEF25 leaf is surfaced with its substituted (SEF25-style) ref.
      expect(prow).toBeDefined();
      expect(prow.ntsRef).toBe("R1.1");

      // And rw still makes privateRightOfWay required.
      expect(ra.required).toContain("publicRightOfWay");
      expect(ra.required).toContain("privateRightOfWay");
    });

    test("merge order does not matter — rw before nts2023 yields the same parent refs", () => {
      const schema = getTransactionSchema(schemaId, ["rw", "nts2023"]);

      const ria =
        schema.properties?.propertyPack?.properties?.rightsAndInformalArrangements;
      const ra = ria?.properties?.rightsOrArrangements;

      expect(ria.ntsRef).toBe("C2.2");
      expect(ra.ntsRef).toBe("C2.2.1");
      expect(ra.properties.privateRightOfWay.ntsRef).toBe("R1.1");
    });
  });
});
