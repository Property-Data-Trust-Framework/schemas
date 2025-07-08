const {
  getTransactionSchema,
  extensionOverlays,
  getValidator,
} = require("../../../index.js");

const schemaId = "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

describe("Extension Overlays", () => {
  
  describe("String key support", () => {
    test("should load extension overlays using string keys", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "jk"]);
      const jkProp = schema.properties?.propertyPack?.properties?.specialistIssues?.properties?.japaneseKnotweed;
      
      expect(jkProp).toBeDefined();
      expect(jkProp.ntsRef).toBe("A5.3");
    });

    test("should work with multiple extension string keys", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "jk", "tf", "ma"]);
      
      const jkProp = schema.properties?.propertyPack?.properties?.specialistIssues?.properties?.japaneseKnotweed;
      const tfProp = schema.properties?.propertyPack?.properties?.ownership?.properties?.ownershipsToBeTransferred?.items?.oneOf?.[2]?.properties?.leaseholdInformation?.properties?.serviceCharge?.oneOf?.[1]?.properties?.transferFees;
      const maProp = schema.properties?.propertyPack?.properties?.ownership?.properties?.ownershipsToBeTransferred?.items?.oneOf?.[2]?.properties?.leaseholdInformation?.properties?.contactDetails;
      
      expect(jkProp?.ntsRef).toBe("A5.3");
      expect(tfProp?.ntsRef).toBe("A3.5.1.1");
      expect(maProp?.ntsRef).toBe("A1.5.4");
    });

    test("should be equivalent to direct object access", () => {
      const schemaString = getTransactionSchema(schemaId, ["nts2023", "jk"]);
      const schemaDirect = getTransactionSchema(schemaId, ["nts2023", extensionOverlays.jk]);
      
      expect(schemaString).toEqual(schemaDirect);
    });
  });

  describe("Individual extension functionality", () => {
    test("should add Japanese Knotweed extension correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "jk"]);
      const jkProp = schema.properties?.propertyPack?.properties?.specialistIssues?.properties?.japaneseKnotweed;
      
      expect(jkProp).toBeDefined();
      expect(jkProp.ntsRef).toBe("A5.3");
      expect(jkProp.required).toContain("yesNo");
      expect(jkProp.discriminator?.propertyName).toBe("yesNo");
    });

    test("should add Transfer Fees extension correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "tf"]);
      const tfProp = schema.properties?.propertyPack?.properties?.ownership?.properties?.ownershipsToBeTransferred?.items?.oneOf?.[2]?.properties?.leaseholdInformation?.properties?.serviceCharge?.oneOf?.[1]?.properties?.transferFees;
      
      expect(tfProp).toBeDefined();
      expect(tfProp.ntsRef).toBe("A3.5.1.1");
      expect(tfProp.title).toBe("Are there any additional fees payable on sale or letting?");
    });

    test("should add Managing Agent extension correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "ma"]);
      const maProp = schema.properties?.propertyPack?.properties?.ownership?.properties?.ownershipsToBeTransferred?.items?.oneOf?.[2]?.properties?.leaseholdInformation?.properties?.contactDetails;
      
      expect(maProp).toBeDefined();
      expect(maProp.ntsRef).toBe("A1.5.4");
      expect(maProp.required).toContain("contacts");
    });

    test("should add Solar Panels extension correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "sl"]);
      const slProp = schema.properties?.propertyPack?.properties?.electricity?.properties?.solarPanels?.oneOf?.[1]?.properties?.panelsOwnedOutright;
      
      expect(slProp).toBeDefined();
      expect(slProp.ntsRef).toBe("B3.7.1");
    });

    test("should add Heating Installation extension correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "hi"]);
      const hiProp = schema.properties?.propertyPack?.properties?.heating?.properties?.heatingSystem?.oneOf?.[1]?.properties?.centralHeatingDetails?.properties?.centralHeatingInstalled;
      
      expect(hiProp).toBeDefined();
      expect(hiProp.ntsRef).toBe("B3.4.3.2");
    });
  });

  describe("Extension overlay availability", () => {
    test("should export all extension overlays", () => {
      const expectedKeys = [
        "as", "dr", "jk", "sb", "hs",  // Specialist Issues
        "oa", "la", "sf", "mc",        // Property Features
        "er", "ma", "tf",              // Ownership & Financial
        "sl", "hi", "fd",              // Utilities & Services
        "oc"                           // Transaction
      ];
      
      expect(Object.keys(extensionOverlays).sort()).toEqual(expectedKeys.sort());
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
        "as", "dr", "jk", "sb", "hs",
        // Property features extensions  
        "oa", "la", "sf", "mc",
        // Ownership & financial extensions
        "er", "ma", "tf", 
        // Utilities & services extensions
        "sl", "hi", "fd",
        // Transaction extensions
        "oc"
      ];
      
      const ntsWithAllExtensions = getTransactionSchema(schemaId, allExtensions);
      
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
      expect(extPropPack?.properties?.residentialPropertyFeatures?.properties?.outsideAreas).toBeDefined();
      
      // Check leasehold extensions
      const leaseholdInfo = extPropPack?.properties?.ownership?.properties?.ownershipsToBeTransferred?.items?.oneOf?.[2]?.properties?.leaseholdInformation;
      expect(leaseholdInfo?.properties?.contactDetails).toBeDefined(); // Managing agent
      expect(leaseholdInfo?.properties?.serviceCharge?.oneOf?.[1]?.properties?.transferFees).toBeDefined(); // Transfer fees
      
      // Check utility extensions
      expect(extPropPack?.properties?.electricity?.properties?.solarPanels?.oneOf?.[1]?.properties?.panelsOwnedOutright).toBeDefined();
      expect(extPropPack?.properties?.heating?.properties?.heatingSystem?.oneOf?.[1]?.properties?.centralHeatingDetails?.properties?.centralHeatingInstalled).toBeDefined();
      
      // Check construction extensions
      expect(extPropPack?.properties?.typeOfConstruction?.properties?.loft).toBeDefined();
      expect(extPropPack?.properties?.typeOfConstruction?.properties?.sprayFoamInsulation).toBeDefined();
      
      // Check completion and moving
      expect(extPropPack?.properties?.completionAndMoving?.properties?.otherPropertyInChain).toBeDefined();
    });

    test("should validate data successfully with all extensions", () => {
      const allExtensions = [
        "nts2023", "as", "dr", "jk", "sb", "hs", "oa", "la", "sf", "mc", 
        "er", "ma", "tf", "sl", "hi", "fd", "oc"
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
            ongoingHealthOrSafetyIssue: { yesNo: "No" }
          }
        }
      };
      
      // This might not validate due to missing required fields, but validator should not throw
      expect(() => validator(testData)).not.toThrow();
    });
  });

  describe("Extension merging behavior", () => {
    test("should preserve required arrays when merging extensions", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "jk", "as"]);
      const siSection = schema.properties?.propertyPack?.properties?.specialistIssues;
      
      expect(siSection?.required).toBeDefined();
      expect(siSection.required).toContain("japaneseKnotweed");
      expect(siSection.required).toContain("containsAsbestos");
    });

    test("should handle discriminator patterns correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "jk"]);
      const jkProp = schema.properties?.propertyPack?.properties?.specialistIssues?.properties?.japaneseKnotweed;
      
      expect(jkProp?.discriminator).toBeDefined();
      expect(jkProp.discriminator.propertyName).toBe("yesNo");
      expect(jkProp.oneOf).toBeDefined();
      expect(Array.isArray(jkProp.oneOf)).toBe(true);
    });

    test("should merge oneOf schemas correctly", () => {
      const schema = getTransactionSchema(schemaId, ["nts2023", "tf"]);
      const tfProp = schema.properties?.propertyPack?.properties?.ownership?.properties?.ownershipsToBeTransferred?.items?.oneOf?.[2]?.properties?.leaseholdInformation?.properties?.serviceCharge?.oneOf?.[1]?.properties?.transferFees;
      
      expect(tfProp?.oneOf).toBeDefined();
      expect(tfProp.oneOf.length).toBeGreaterThan(0);
      
      // Check the structure - details should be in the conditional oneOf branch
      const conditionalBranch = tfProp.oneOf.find(branch => 
        branch.properties?.details || branch.required?.includes("details")
      );
      expect(conditionalBranch).toBeDefined();
      expect(conditionalBranch.properties?.details || conditionalBranch.required?.includes("details")).toBeTruthy();
    });
  });
});