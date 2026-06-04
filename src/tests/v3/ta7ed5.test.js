const {
  getTransactionSchema,
  getSubschemaValidator,
} = require("../../../index.js");
const ta7ed5Overlay = require("../../schemas/v3/overlays/ta7ed5.json");

const schemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

const overlays = ["ta7ed5"];

const collectRequiredWithoutPropertyIssues = (schema) => {
  const issues = [];

  const walk = (node, path = "#") => {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node.required)) {
      node.required.forEach((propertyName) => {
        if (!node.properties?.[propertyName]) {
          issues.push(`${path} requires ${propertyName}`);
        }
      });
    }

    Object.entries(node.properties || {}).forEach(([key, value]) =>
      walk(value, `${path}/properties/${key}`)
    );
    (node.oneOf || []).forEach((value, index) =>
      walk(value, `${path}/oneOf/${index}`)
    );
    if (node.items) walk(node.items, `${path}/items`);
  };

  walk(schema);
  return issues;
};

// Helper: navigate to a deeply nested property in the merged schema
const getSchemaProperty = (schema, dotPath) => {
  return dotPath.split(".").reduce((obj, key) => obj?.[key], schema);
};

// Base path to leasehold information (through the ownership discriminator)
// The /0/ element navigates through the array type to items, then
// leaseholdInformation is found in the Leasehold oneOf branch.
const leaseholdBase =
  "/propertyPack/ownership/ownershipsToBeTransferred/0/leaseholdInformation";

describe("TA7 5th edition overlay", () => {
  let schema;

  beforeAll(() => {
    schema = getTransactionSchema(schemaId, overlays);
  });

  // ---------------------------------------------------------------
  // Schema structure tests
  // ---------------------------------------------------------------

  describe("overlay structure", () => {
    test("merged schema requires address and ownership at propertyPack level", () => {
      const required = schema.properties?.propertyPack?.required;
      expect(required).toContain("address");
      expect(required).toContain("ownership");
    });

    test("generated overlay exposes every TA7 edition 5 required property", () => {
      expect(collectRequiredWithoutPropertyIssues(ta7ed5Overlay)).toEqual([]);
    });

    test("leasehold branch requires the referenced ta7ed5 sections", () => {
      const leaseholdOneOf =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf;

      // Find the Leasehold branch
      const leaseholdBranch = leaseholdOneOf?.find((branch) =>
        branch.properties?.ownershipType?.enum?.includes("Leasehold")
      );
      expect(leaseholdBranch).toBeDefined();

      const required =
        leaseholdBranch.properties.leaseholdInformation.required;
      expect(required).toContain("typeOfLeasehold");
      expect(required).toContain("contactDetails");
      expect(required).toContain("ownershipAndManagement");
      expect(required).toContain("serviceCharge");
      expect(required).toContain("disputes");
      expect(required).toContain("buildingSafetyAct");
      expect(required).toContain("enfranchisement");
      expect(required).toContain("requiredDocuments");
      expect(required).toContain("additionalInformation");
      expect(required).toContain("confirmationOfAccuracy");
      expect(required).not.toContain("buildingSafety");
    });
  });

  // ---------------------------------------------------------------
  // typeOfLeasehold discriminator (section 2.1)
  // ---------------------------------------------------------------

  describe("typeOfLeasehold discriminator", () => {
    const path = `${leaseholdBase}/typeOfLeasehold`;

    test("valid with a standard leasehold type", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({ leaseholdType: "Flat" })).toBe(true);
    });

    test("valid with Other when otherLeaseholdType provided", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(
        validator({
          leaseholdType: "Other",
          otherLeaseholdType: "Live/work unit",
        })
      ).toBe(true);
    });

    test("invalid with Other when otherLeaseholdType missing", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({ leaseholdType: "Other" })).toBe(false);
      const err = validator.errors.find((e) =>
        e.message.includes("otherLeaseholdType")
      );
      expect(err).toBeDefined();
    });

    test("invalid when leaseholdType missing entirely", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({})).toBe(false);
    });

    test("invalid with unrecognised enum value", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({ leaseholdType: "Bungalow" })).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // Managing agent contact required fields (section 4.1)
  // ---------------------------------------------------------------

  describe("managingAgent contact required fields", () => {
    const path = `${leaseholdBase}/contactDetails/contacts/managingAgent`;

    test("valid managing agent with all required fields", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(
        validator({
          contact: {
            nameOrOrganisation: "ABC Property Management",
            address: { line1: "1 High St", postcode: "SW1A 1AA" },
            emailAddress: "info@abc.co.uk",
          },
        })
      ).toBe(true);
    });

    test("invalid when contact is missing", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({})).toBe(false);
      const err = validator.errors.find((e) =>
        e.message.includes("contact")
      );
      expect(err).toBeDefined();
    });

    test("invalid when contact.emailAddress is missing", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(
        validator({
          contact: {
            nameOrOrganisation: "ABC Property Management",
            address: { line1: "1 High St", postcode: "SW1A 1AA" },
          },
        })
      ).toBe(false);
      const err = validator.errors.find((e) =>
        e.message.includes("emailAddress")
      );
      expect(err).toBeDefined();
    });

    test("invalid when contact.nameOrOrganisation is missing", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(
        validator({
          contact: {
            address: { line1: "1 High St", postcode: "SW1A 1AA" },
            emailAddress: "info@abc.co.uk",
          },
        })
      ).toBe(false);
    });

    test("telephone is not required for managing agent contact", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      // Valid without telephone
      expect(
        validator({
          contact: {
            nameOrOrganisation: "ABC Property Management",
            address: { line1: "1 High St", postcode: "SW1A 1AA" },
            emailAddress: "info@abc.co.uk",
          },
        })
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // ownershipAndManagement required fields (section 4)
  // ---------------------------------------------------------------

  describe("ownershipAndManagement required fields", () => {
    const path = `${leaseholdBase}/ownershipAndManagement`;

    test("requires isManagingAgentEmployed, sellerOwnership, hasTenantCompanyDissolved", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({})).toBe(false);

      const missingFields = validator.errors
        .filter((e) => e.keyword === "required")
        .map((e) => e.params.missingProperty);

      expect(missingFields).toContain("isManagingAgentEmployed");
      expect(missingFields).toContain("sellerOwnership");
      expect(missingFields).toContain("hasTenantCompanyDissolved");
    });

    test("isManagingAgentEmployed accepts Not applicable", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      validator({
        isManagingAgentEmployed: "Not applicable",
        sellerOwnership: { yesNo: "No" },
        hasTenantCompanyDissolved: "No",
      });
      // Should not have enum errors for isManagingAgentEmployed
      const enumErr = (validator.errors || []).find(
        (e) =>
          e.instancePath === "/isManagingAgentEmployed" &&
          e.keyword === "enum"
      );
      expect(enumErr).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  // collectsGroundRent discriminator (section 4.3)
  // ---------------------------------------------------------------

  describe("collectsGroundRent discriminator", () => {
    const path = `${leaseholdBase}/contactDetails/serviceContactAssignments/collectsGroundRent`;

    test("requires collector field", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({})).toBe(false);
      const err = validator.errors.find(
        (e) =>
          e.keyword === "required" &&
          e.params.missingProperty === "collector"
      );
      expect(err).toBeDefined();
    });

    test("valid with Landlord (no otherCollector needed)", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({ collector: "Landlord" })).toBe(true);
    });

    test("valid with Management Company (no otherCollector needed)", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({ collector: "Management Company" })).toBe(true);
    });

    test("invalid with Other when otherCollector is missing", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({ collector: "Other" })).toBe(false);
      const err = validator.errors.find(
        (e) =>
          e.keyword === "required" &&
          e.params.missingProperty === "otherCollector"
      );
      expect(err).toBeDefined();
    });

    test("valid with Other when otherCollector is provided", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(
        validator({ collector: "Other", otherCollector: "The Crown Estate" })
      ).toBe(true);
    });

    test("invalid with Other when otherCollector is empty string", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(
        validator({ collector: "Other", otherCollector: "" })
      ).toBe(false);
    });

    test("invalid with unrecognised enum value", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({ collector: "The Pope" })).toBe(false);
    });

    test("invalid when collector is wrong type", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({ collector: 42 })).toBe(false);
    });

    test("ta7ed5 overlay enum has exactly 3 values", () => {
      const leaseholdOneOf =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf;
      const leaseholdBranch = leaseholdOneOf?.find((branch) =>
        branch.properties?.ownershipType?.enum?.includes("Leasehold")
      );
      const collector =
        leaseholdBranch?.properties?.leaseholdInformation?.properties
          ?.contactDetails?.properties?.serviceContactAssignments?.properties
          ?.collectsGroundRent?.properties?.collector;
      expect(collector?.enum).toEqual([
        "Landlord",
        "Management Company",
        "Other",
      ]);
    });
  });

  // ---------------------------------------------------------------
  // collectsbuildingInsurancePremiums discriminator (section 4.2)
  // ---------------------------------------------------------------

  describe("collectsbuildingInsurancePremiums discriminator", () => {
    const path = `${leaseholdBase}/contactDetails/serviceContactAssignments/collectsbuildingInsurancePremiums`;

    test("requires collector field", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({})).toBe(false);
      const err = validator.errors.find(
        (e) =>
          e.keyword === "required" &&
          e.params.missingProperty === "collector"
      );
      expect(err).toBeDefined();
    });

    test("valid with Freeholder (no otherCollector needed)", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({ collector: "Freeholder" })).toBe(true);
    });

    test("valid with each non-Other enum value", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      for (const value of [
        "Freeholder",
        "Landlord",
        "Management Company",
        "Head Leaseholder",
        "Seller",
      ]) {
        expect(validator({ collector: value })).toBe(true);
      }
    });

    test("invalid with Other when otherCollector is missing", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({ collector: "Other" })).toBe(false);
      const err = validator.errors.find(
        (e) =>
          e.keyword === "required" &&
          e.params.missingProperty === "otherCollector"
      );
      expect(err).toBeDefined();
    });

    test("valid with Other when otherCollector is provided", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(
        validator({
          collector: "Other",
          otherCollector: "Residents association",
        })
      ).toBe(true);
    });

    test("invalid with Other when otherCollector is empty string", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(
        validator({ collector: "Other", otherCollector: "" })
      ).toBe(false);
    });

    test("invalid with unrecognised enum value", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({ collector: "Managing Agent" })).toBe(false);
    });

    test("ta7ed5 overlay enum has exactly 6 values", () => {
      const leaseholdOneOf =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf;
      const leaseholdBranch = leaseholdOneOf?.find((branch) =>
        branch.properties?.ownershipType?.enum?.includes("Leasehold")
      );
      const collector =
        leaseholdBranch?.properties?.leaseholdInformation?.properties
          ?.contactDetails?.properties?.serviceContactAssignments?.properties
          ?.collectsbuildingInsurancePremiums?.properties?.collector;
      expect(collector?.enum).toEqual([
        "Freeholder",
        "Landlord",
        "Management Company",
        "Head Leaseholder",
        "Seller",
        "Other",
      ]);
    });
  });

  // ---------------------------------------------------------------
  // serviceContactAssignments required fields
  // ---------------------------------------------------------------

  describe("serviceContactAssignments required fields", () => {
    const path = `${leaseholdBase}/contactDetails/serviceContactAssignments`;

    test("requires collectsGroundRent and collectsbuildingInsurancePremiums", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(validator({})).toBe(false);

      const missingFields = validator.errors
        .filter((e) => e.keyword === "required")
        .map((e) => e.params.missingProperty);

      expect(missingFields).toContain("collectsGroundRent");
      expect(missingFields).toContain("collectsbuildingInsurancePremiums");
    });

    test("valid when both collection fields provided", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(
        validator({
          collectsGroundRent: { collector: "Landlord" },
          collectsbuildingInsurancePremiums: { collector: "Management Company" },
        })
      ).toBe(true);
    });

    test("invalid when collectsGroundRent is a string instead of object", () => {
      const validator = getSubschemaValidator(path, schemaId, overlays);
      expect(
        validator({
          collectsGroundRent: "Landlord",
          collectsbuildingInsurancePremiums: { collector: "Landlord" },
        })
      ).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // Removed properties should not exist
  // ---------------------------------------------------------------

  describe("removed redundant properties", () => {
    test("isGroundRentCollectedByManagingAgent does not exist in merged schema", () => {
      const leaseholdOneOf =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf;
      const leaseholdBranch = leaseholdOneOf?.find((branch) =>
        branch.properties?.ownershipType?.enum?.includes("Leasehold")
      );
      const serviceContactAssignments =
        leaseholdBranch?.properties?.leaseholdInformation?.properties
          ?.contactDetails?.properties?.serviceContactAssignments;

      expect(
        serviceContactAssignments?.properties
          ?.isGroundRentCollectedByManagingAgent
      ).toBeUndefined();
    });

    test("managingAgentArrangesOrCollectsBuildingInsuranceCharges does not exist in merged schema", () => {
      const leaseholdOneOf =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf;
      const leaseholdBranch = leaseholdOneOf?.find((branch) =>
        branch.properties?.ownershipType?.enum?.includes("Leasehold")
      );
      const serviceContactAssignments =
        leaseholdBranch?.properties?.leaseholdInformation?.properties
          ?.contactDetails?.properties?.serviceContactAssignments;

      expect(
        serviceContactAssignments?.properties
          ?.managingAgentArrangesOrCollectsBuildingInsuranceCharges
      ).toBeUndefined();
    });

    test("standalone groundRentOtherCollector does not exist (absorbed into collectsGroundRent oneOf)", () => {
      const leaseholdOneOf =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf;
      const leaseholdBranch = leaseholdOneOf?.find((branch) =>
        branch.properties?.ownershipType?.enum?.includes("Leasehold")
      );
      const serviceContactAssignments =
        leaseholdBranch?.properties?.leaseholdInformation?.properties
          ?.contactDetails?.properties?.serviceContactAssignments;

      expect(
        serviceContactAssignments?.properties?.groundRentOtherCollector
      ).toBeUndefined();
    });

    test("standalone buildingInsurancePremiumsOtherCollector does not exist (absorbed into collectsbuildingInsurancePremiums oneOf)", () => {
      const leaseholdOneOf =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf;
      const leaseholdBranch = leaseholdOneOf?.find((branch) =>
        branch.properties?.ownershipType?.enum?.includes("Leasehold")
      );
      const serviceContactAssignments =
        leaseholdBranch?.properties?.leaseholdInformation?.properties
          ?.contactDetails?.properties?.serviceContactAssignments;

      expect(
        serviceContactAssignments?.properties
          ?.buildingInsurancePremiumsOtherCollector
      ).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  // Discriminator structure in the overlay
  // ---------------------------------------------------------------

  describe("discriminator oneOf structure", () => {
    test("collectsGroundRent has discriminator on collector with two branches", () => {
      const leaseholdOneOf =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf;
      const leaseholdBranch = leaseholdOneOf?.find((branch) =>
        branch.properties?.ownershipType?.enum?.includes("Leasehold")
      );
      const collectsGroundRent =
        leaseholdBranch?.properties?.leaseholdInformation?.properties
          ?.contactDetails?.properties?.serviceContactAssignments?.properties
          ?.collectsGroundRent;

      expect(collectsGroundRent.discriminator).toEqual({
        propertyName: "collector",
      });
      expect(collectsGroundRent.oneOf).toHaveLength(2);

      // Branch 1: non-Other values
      const branch1Enum =
        collectsGroundRent.oneOf[0].properties.collector.enum;
      expect(branch1Enum).not.toContain("Other");

      // Branch 2: Other + required otherCollector
      const branch2 = collectsGroundRent.oneOf[1];
      expect(branch2.properties.collector.enum).toEqual(["Other"]);
      expect(branch2.required).toContain("otherCollector");
      expect(branch2.properties.otherCollector).toBeDefined();
      expect(branch2.properties.otherCollector.type).toBe("string");
    });

    test("collectsbuildingInsurancePremiums has discriminator on collector with two branches", () => {
      const leaseholdOneOf =
        schema.properties?.propertyPack?.properties?.ownership?.properties
          ?.ownershipsToBeTransferred?.items?.oneOf;
      const leaseholdBranch = leaseholdOneOf?.find((branch) =>
        branch.properties?.ownershipType?.enum?.includes("Leasehold")
      );
      const collectsInsurance =
        leaseholdBranch?.properties?.leaseholdInformation?.properties
          ?.contactDetails?.properties?.serviceContactAssignments?.properties
          ?.collectsbuildingInsurancePremiums;

      expect(collectsInsurance.discriminator).toEqual({
        propertyName: "collector",
      });
      expect(collectsInsurance.oneOf).toHaveLength(2);

      // Branch 1: non-Other values (superset of all overlay values)
      const branch1Enum =
        collectsInsurance.oneOf[0].properties.collector.enum;
      expect(branch1Enum).toHaveLength(7);
      expect(branch1Enum).not.toContain("Other");

      // Branch 2: Other + required otherCollector
      const branch2 = collectsInsurance.oneOf[1];
      expect(branch2.properties.collector.enum).toEqual(["Other"]);
      expect(branch2.required).toContain("otherCollector");
    });
  });
});
