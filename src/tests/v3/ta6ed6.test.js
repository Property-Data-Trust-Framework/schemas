const {
  getTransactionSchema,
  getSubschemaValidator,
} = require("../../../index.js");
const ta6ed6Overlay = require("../../schemas/v3/overlays/ta6ed6.json");

const schemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

const collectRequiredWithoutPropertyIssues = (schema) => {
  const issues = [];

  // A oneOf branch may require a property declared on its enclosing object -- that is
  // valid JSON Schema and AJV enforces it against the same instance. So a branch is
  // checked against its own properties plus those it inherits from the parent.
  const walk = (node, path = "#", inherited = {}) => {
    if (!node || typeof node !== "object") return;

    const visible = { ...inherited, ...(node.properties || {}) };

    if (Array.isArray(node.required)) {
      node.required.forEach((propertyName) => {
        if (!visible[propertyName]) {
          issues.push(`${path} requires ${propertyName}`);
        }
      });
    }

    Object.entries(node.properties || {}).forEach(([key, value]) =>
      walk(value, `${path}/properties/${key}`)
    );
    (node.oneOf || []).forEach((value, index) =>
      walk(value, `${path}/oneOf/${index}`, visible)
    );
    if (node.items) walk(node.items, `${path}/items`);
  };

  walk(schema);
  return issues;
};

describe("TA6 Edition 6 overlay", () => {
  describe("Schema merging", () => {
    test("merged schema contains ta6ed6Ref annotations", () => {
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      expect(schema.properties.propertyPack.properties.address.ta6ed6Ref).toBe(
        "1.1"
      );
      expect(
        schema.properties.propertyPack.properties.parking.ta6ed6Ref
      ).toBe("10");
      expect(
        schema.properties.propertyPack.properties.electricalWorks.ta6ed6Ref
      ).toBe("11");
    });

    test("generated overlay exposes every TA6 edition 6 required property", () => {
      expect(collectRequiredWithoutPropertyIssues(ta6ed6Overlay)).toEqual([]);
    });

    test("merged schema has all 22 ta6ed6 required propertyPack sections", () => {
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      const required = schema.properties.propertyPack.required;
      const expectedRequired = [
        "address",
        "parking",
        "disputesAndComplaints",
        "alterationsAndChanges",
        "listingAndConservation",
        "notices",
        "specialistIssues",
        "waterAndDrainage",
        "electricity",
        "heating",
        "connectivity",
        "insurance",
        "rightsAndInformalArrangements",
        "environmentalIssues",
        "legalBoundaries",
        "servicesCrossing",
        "electricalWorks",
        "guaranteesWarrantiesAndIndemnityInsurances",
        "occupiers",
        "completionAndMoving",
        "confirmationOfAccuracyByOwners",
        "additionalInformation",
      ];
      expectedRequired.forEach((field) => {
        expect(required).toContain(field);
      });
    });

    test("merged schema requires participants and propertyPack at root", () => {
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      expect(schema.required).toContain("participants");
      expect(schema.required).toContain("propertyPack");
    });

    test("can combine ta6ed6 with baspiV5 overlay", () => {
      const schema = getTransactionSchema(schemaId, ["baspiV5", "ta6ed6"]);
      const parkingProp =
        schema.properties.propertyPack.properties.parking.properties
          .parkingArrangements;
      expect(parkingProp.baspi5Ref).toBe("A1.6.0");
      expect(parkingProp.ta6ed6Ref).toBe("10.1");
    });

    test("alterationsAndChanges requires ta6ed6-specific fields", () => {
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      const required =
        schema.properties.propertyPack.properties.alterationsAndChanges
          .required;
      expect(required).toContain("hasStructuralAlterations");
      expect(required).toContain("nonResidentialPurposes");
      expect(required).not.toContain("extension"); // per-type nodes are not on the form
      expect(required).not.toContain("changeOfUse"); // removed in ed6
      expect(required).toContain("planningPermissionBreaches");
      expect(required).toContain("unresolvedPlanningIssues");
    });

    test("parking requires parkingArrangements, controlledParking, and electricVehicleChargingPoint", () => {
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      const required =
        schema.properties.propertyPack.properties.parking.required;
      expect(required).toEqual(
        expect.arrayContaining([
          "parkingArrangements",
          "controlledParking",
          "electricVehicleChargingPoint",
        ])
      );
    });

    test("occupiers requires sellerLivesAtProperty and othersAged17OrOver", () => {
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      const required =
        schema.properties.propertyPack.properties.occupiers.required;
      expect(required).toContain("sellerLivesAtProperty");
      expect(required).toContain("othersAged17OrOver");
    });

    test("completionAndMoving requires sellerWillEnsure and sufficientToRepayAllMortgages", () => {
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      const required =
        schema.properties.propertyPack.properties.completionAndMoving.required;
      expect(required).toContain("sellerWillEnsure");
      expect(required).toContain("sufficientToRepayAllMortgages");
    });

    test("heating requires ta6ed6-specific fields", () => {
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      const required =
        schema.properties.propertyPack.properties.heating.required;
      expect(required).toContain("mainHeatingTypes");
      expect(required).toContain("inspectionReport");
      expect(required).not.toContain("heatingSystem");
      expect(required).not.toContain("otherHeatingFeatures");
      expect(required).not.toContain("multipleHeatingSystems"); // 11.4h is optional
    });
  });

  describe("Parking section validation", () => {
    let parkingValidator;

    beforeAll(() => {
      parkingValidator = getSubschemaValidator(
        "/propertyPack/parking",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("valid parking data passes", () => {
      const data = {
        parkingArrangements: ["Driveway"],
        controlledParking: { yesNo: "No" },
        electricVehicleChargingPoint: { yesNo: "No" },
      };
      expect(parkingValidator(data)).toBe(true);
    });

    test("missing parkingArrangements is invalid", () => {
      const data = {
        controlledParking: { yesNo: "No" },
        electricVehicleChargingPoint: { yesNo: "No" },
      };
      expect(parkingValidator(data)).toBe(false);
      expect(
        parkingValidator.errors.some((e) =>
          e.message.includes("'parkingArrangements'")
        )
      ).toBe(true);
    });

    test("missing controlledParking is invalid", () => {
      const data = {
        parkingArrangements: ["Driveway"],
        electricVehicleChargingPoint: { yesNo: "No" },
      };
      expect(parkingValidator(data)).toBe(false);
      expect(
        parkingValidator.errors.some((e) =>
          e.message.includes("'controlledParking'")
        )
      ).toBe(true);
    });

    test("missing electricVehicleChargingPoint is invalid", () => {
      const data = {
        parkingArrangements: ["Driveway"],
        controlledParking: { yesNo: "No" },
      };
      expect(parkingValidator(data)).toBe(false);
      expect(
        parkingValidator.errors.some((e) =>
          e.message.includes("'electricVehicleChargingPoint'")
        )
      ).toBe(true);
    });

    test("controlledParking Yes is valid", () => {
      const data = {
        parkingArrangements: ["Driveway"],
        controlledParking: { yesNo: "Yes" },
        electricVehicleChargingPoint: { yesNo: "No" },
      };
      expect(parkingValidator(data)).toBe(true);
    });

    test("controlledParking No is valid", () => {
      const data = {
        parkingArrangements: ["Driveway"],
        controlledParking: { yesNo: "No" },
        electricVehicleChargingPoint: { yesNo: "No" },
      };
      expect(parkingValidator(data)).toBe(true);
    });

    test("electricVehicleChargingPoint Yes without additional details is invalid", () => {
      const data = {
        parkingArrangements: ["Driveway"],
        controlledParking: { yesNo: "No" },
        electricVehicleChargingPoint: { yesNo: "Yes" },
      };
      expect(parkingValidator(data)).toBe(false);
      expect(
        parkingValidator.errors.some((e) =>
          e.message.includes("'chargerDetails'")
        )
      ).toBe(true);
    });

    test("electricVehicleChargingPoint Yes with all required details is valid", () => {
      const data = {
        parkingArrangements: ["Driveway"],
        controlledParking: { yesNo: "No" },
        electricVehicleChargingPoint: {
          yesNo: "Yes",
          chargerDetails: "7kW home charger",
          chargerDetailsAttachments: "Attached",
          cableCrossesPavement: { yesNo: "No" },
        },
      };
      expect(parkingValidator(data)).toBe(true);
    });

    test("electricVehicleChargingPoint cable crosses pavement Yes without details is invalid", () => {
      const data = {
        parkingArrangements: ["Driveway"],
        controlledParking: { yesNo: "No" },
        electricVehicleChargingPoint: {
          yesNo: "Yes",
          chargerDetails: "7kW home charger",
          chargerDetailsAttachments: "Attached",
          cableCrossesPavement: { yesNo: "Yes" },
        },
      };
      expect(parkingValidator(data)).toBe(false);
      expect(
        parkingValidator.errors.some((e) => e.message.includes("'details'"))
      ).toBe(true);
    });

    test("electricVehicleChargingPoint cable crosses pavement Yes with details is valid", () => {
      const data = {
        parkingArrangements: ["Driveway"],
        controlledParking: { yesNo: "No" },
        electricVehicleChargingPoint: {
          yesNo: "Yes",
          chargerDetails: "7kW home charger",
          chargerDetailsAttachments: "Attached",
          cableCrossesPavement: {
            yesNo: "Yes",
            details: "Cable runs under pavement with council approval",
          },
        },
      };
      expect(parkingValidator(data)).toBe(true);
    });
  });

  describe("Disputes and complaints validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/disputesAndComplaints",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("valid disputes data with No answers passes", () => {
      const data = {
        hasDisputesAndComplaints: { yesNo: "No" },
        leadingToDisputesAndComplaints: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("hasDisputesAndComplaints Yes without details is invalid", () => {
      const data = {
        hasDisputesAndComplaints: { yesNo: "Yes" },
        leadingToDisputesAndComplaints: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'details'"))
      ).toBe(true);
    });

    test("hasDisputesAndComplaints Yes with details is valid", () => {
      const data = {
        hasDisputesAndComplaints: {
          yesNo: "Yes",
          details: "Boundary fence dispute with neighbour",
        },
        leadingToDisputesAndComplaints: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("leadingToDisputesAndComplaints Yes without details is invalid", () => {
      const data = {
        hasDisputesAndComplaints: { yesNo: "No" },
        leadingToDisputesAndComplaints: { yesNo: "Yes" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'details'"))
      ).toBe(true);
    });

    test("leadingToDisputesAndComplaints Yes with details is valid", () => {
      const data = {
        hasDisputesAndComplaints: { yesNo: "No" },
        leadingToDisputesAndComplaints: {
          yesNo: "Yes",
          details: "Ongoing noise dispute",
        },
      };
      expect(validator(data)).toBe(true);
    });
  });

  describe("Listing and conservation validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/listingAndConservation",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("valid data with all No answers passes", () => {
      const data = {
        isListed: { yesNo: "No" },
        isConservationArea: { yesNo: "No" },
        hasTreePreservationOrder: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("isListed missing yesNo is invalid", () => {
      const data = {
        isListed: {},
        isConservationArea: { yesNo: "No" },
        hasTreePreservationOrder: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'yesNo'"))
      ).toBe(true);
    });

    test("missing isConservationArea is invalid", () => {
      const data = {
        isListed: { yesNo: "No" },
        hasTreePreservationOrder: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'isConservationArea'")
        )
      ).toBe(true);
    });

    test("missing hasTreePreservationOrder is invalid", () => {
      const data = {
        isListed: { yesNo: "No" },
        isConservationArea: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'hasTreePreservationOrder'")
        )
      ).toBe(true);
    });

    test("Not known is valid for isListed and isConservationArea", () => {
      const data = {
        isListed: { yesNo: "Not known" },
        isConservationArea: { yesNo: "Not known" },
        hasTreePreservationOrder: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });
  });

  describe("Heating section validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/heating",
        schemaId,
        ["ta6ed6"]
      );
    });

    // §11.4 as on the form: one multi-select of heating types plus a shared 11.4a-h block.
    const valid = {
      mainHeatingTypes: ["Mains gas"],
      heatingInstalledDate: "Not known",
      boilerInstalledDate: "2018-01-01",
      heatingSystemReplaced: "No",
      complianceCertificates: "None",
      inspectionReport: "To follow",
      inGoodWorkingOrder: "Yes",
      lastServicedYear: "2022",
    };

    test("valid heating data passes", () => {
      expect(validator(valid)).toBe(true);
    });

    test("missing mainHeatingTypes is invalid", () => {
      const { mainHeatingTypes, ...data } = valid;
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'mainHeatingTypes'"))
      ).toBe(true);
    });

    test("missing inspectionReport (11.4e) is invalid", () => {
      const { inspectionReport, ...data } = valid;
      expect(validator(data)).toBe(false);
    });

    test("the old heatingSystem / otherHeatingFeatures shape is not required", () => {
      expect(validator({ ...valid, heatingSystem: { heatingType: "None" } })).toBe(true);
    });
  });

  describe("Services crossing validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/servicesCrossing",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("valid data with all No answers passes", () => {
      const data = {
        pipesWiresCablesDrainsToProperty: { yesNo: "No" },
        pipesWiresCablesDrainsFromProperty: { yesNo: "No" },
        formalOrInformalAgreements: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("missing pipesWiresCablesDrainsToProperty is invalid", () => {
      const data = {
        pipesWiresCablesDrainsFromProperty: { yesNo: "No" },
        formalOrInformalAgreements: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'pipesWiresCablesDrainsToProperty'")
        )
      ).toBe(true);
    });

    test("pipesWiresCablesDrainsToProperty Yes without details is invalid", () => {
      const data = {
        pipesWiresCablesDrainsToProperty: { yesNo: "Yes" },
        pipesWiresCablesDrainsFromProperty: { yesNo: "No" },
        formalOrInformalAgreements: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'details'"))
      ).toBe(true);
    });

    test("pipesWiresCablesDrainsToProperty Yes with details is valid", () => {
      const data = {
        pipesWiresCablesDrainsToProperty: {
          yesNo: "Yes",
          details: "Shared drainage pipe runs from next door",
        },
        pipesWiresCablesDrainsFromProperty: { yesNo: "No" },
        formalOrInformalAgreements: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });
  });

  describe("Electrical works validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/electricalWorks",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("valid data with all No answers passes", () => {
      const data = {
        testedByQualifiedElectrician: { yesNo: "No" },
        electricalWorkSince2005: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("missing testedByQualifiedElectrician is invalid", () => {
      const data = {
        electricalWorkSince2005: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'testedByQualifiedElectrician'")
        )
      ).toBe(true);
    });

    test("missing electricalWorkSince2005 is invalid", () => {
      const data = {
        testedByQualifiedElectrician: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'electricalWorkSince2005'")
        )
      ).toBe(true);
    });

    test("testedByQualifiedElectrician Yes with year and attachments is valid", () => {
      const data = {
        testedByQualifiedElectrician: {
          yesNo: "Yes",
          yearTested: 2023,
          attachments: "Attached",
        },
        electricalWorkSince2005: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("electricalWorkSince2005 Yes with details and certificate is valid", () => {
      const data = {
        testedByQualifiedElectrician: { yesNo: "No" },
        electricalWorkSince2005: {
          yesNo: "Yes",
          details: "Rewired ground floor",
          yearWorkCarriedOut: 2020,
          suppliedCertificate: {
            certificateType: "Electrical Safety Certificate (BS7671)",
            attachments: "Attached",
          },
        },
      };
      expect(validator(data)).toBe(true);
    });
  });

  describe("Occupiers section validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/occupiers",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("valid occupiers data passes", () => {
      const data = {
        sellerLivesAtProperty: { yesNo: "Yes" },
        othersAged17OrOver: { hasOthersAged17OrOver: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("missing sellerLivesAtProperty is invalid", () => {
      const data = {
        othersAged17OrOver: { hasOthersAged17OrOver: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'sellerLivesAtProperty'")
        )
      ).toBe(true);
    });

    test("missing othersAged17OrOver is invalid", () => {
      const data = {
        sellerLivesAtProperty: { yesNo: "Yes" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'othersAged17OrOver'")
        )
      ).toBe(true);
    });
  });

  describe("Completion and moving validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/completionAndMoving",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("valid completion data passes", () => {
      const data = {
        sellerWillEnsure: {
          removeRubbish: true,
          replaceLightFittings: true,
          takeReasonableCare: true,
          leaveKeys: true,
        },
        sufficientToRepayAllMortgages: { yesNo: "Yes" },
      };
      expect(validator(data)).toBe(true);
    });

    test("missing sellerWillEnsure is invalid", () => {
      const data = {
        sufficientToRepayAllMortgages: { yesNo: "Yes" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'sellerWillEnsure'")
        )
      ).toBe(true);
    });

    test("missing sufficientToRepayAllMortgages is invalid", () => {
      const data = {
        sellerWillEnsure: {
          removeRubbish: true,
          replaceLightFittings: true,
          takeReasonableCare: true,
          leaveKeys: true,
        },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'sufficientToRepayAllMortgages'")
        )
      ).toBe(true);
    });
  });

  describe("Connectivity validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/connectivity",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("valid connectivity with telephone Yes passes", () => {
      const data = {
        telephone: { yesNo: "Yes", supplier: "BT" },
        broadband: { typeOfConnection: "None" },
      };
      expect(validator(data)).toBe(true);
    });

    test("missing telephone is invalid", () => {
      const data = { broadband: { typeOfConnection: "None" } };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'telephone'"))
      ).toBe(true);
    });

    test("telephone No is valid", () => {
      const data = {
        telephone: { yesNo: "No" },
        broadband: { typeOfConnection: "None" },
      };
      expect(validator(data)).toBe(true);
    });
  });

  describe("Insurance section validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/insurance",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("isInsured is a string enum in merged schema", () => {
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      const isInsured =
        schema.properties.propertyPack.properties.insurance.properties
          .isInsured;
      expect(isInsured.type).toBe("string");
      expect(isInsured.enum).toEqual(["Yes", "No"]);
    });

    test("isInsured Yes with insuranceClaims is valid", () => {
      const data = {
        isInsured: "Yes",
        difficultiesObtainingInsurance: {
          abnormalRiseInPremiums: { yesNo: "No" },
          subjectToHighExcesses: { yesNo: "No" },
          subjectToUnusualConditions: { yesNo: "No" },
          refused: { yesNo: "No" },
        },
        insuranceClaims: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("isInsured No with whoInsures is valid", () => {
      const data = {
        isInsured: "No",
        difficultiesObtainingInsurance: {
          abnormalRiseInPremiums: { yesNo: "No" },
          subjectToHighExcesses: { yesNo: "No" },
          subjectToUnusualConditions: { yesNo: "No" },
          refused: { yesNo: "No" },
        },
        whoInsures: "Landlord insures the building",
      };
      expect(validator(data)).toBe(true);
    });

    test("isInsured Yes without insuranceClaims is invalid", () => {
      const data = {
        isInsured: "Yes",
        difficultiesObtainingInsurance: {
          abnormalRiseInPremiums: { yesNo: "No" },
          subjectToHighExcesses: { yesNo: "No" },
          subjectToUnusualConditions: { yesNo: "No" },
          refused: { yesNo: "No" },
        },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'insuranceClaims'"))
      ).toBe(true);
    });

    test("isInsured No without whoInsures is invalid", () => {
      const data = {
        isInsured: "No",
        difficultiesObtainingInsurance: { yesNo: "No" },
        insuranceClaims: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'whoInsures'"))
      ).toBe(true);
    });

    test("missing isInsured is invalid", () => {
      const data = {
        difficultiesObtainingInsurance: { yesNo: "No" },
        insuranceClaims: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'isInsured'"))
      ).toBe(true);
    });

    test("missing difficultiesObtainingInsurance is invalid", () => {
      const data = {
        isInsured: "Yes",
        insuranceClaims: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'difficultiesObtainingInsurance'")
        )
      ).toBe(true);
    });
  });

  describe("Confirmation of accuracy validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/confirmationOfAccuracyByOwners",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("valid confirmation data passes", () => {
      const data = {
        confirmInformationIsAccurate: true,
      };
      expect(validator(data)).toBe(true);
    });

    test("missing confirmInformationIsAccurate is invalid", () => {
      const data = {};
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'confirmInformationIsAccurate'")
        )
      ).toBe(true);
    });
  });

  describe("Rights and informal arrangements validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/rightsAndInformalArrangements",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("valid data with all No answers passes", () => {
      const data = {
        neighbouringLandRights: { yesNo: "No" },
        sharedContributions: { yesNo: "No" },
        rightsOrArrangements: {
          publicRightOfWay: { yesNo: "No" },
          rightsOfLight: { yesNo: "No" },
          rightsOfSupport: { yesNo: "No" },
          rightsCreatedThroughCustom: { yesNo: "No" },
          minesAndMinerals: { yesNo: "No" },
          churchChancel: { yesNo: "No" },
          rightsToTakeFromLand: { yesNo: "No" },
          otherRights: { yesNo: "No" },
          disagreementOrComplaint: { yesNo: "No" },
        },
        rightsOverProperty: { yesNo: "No" },
        askedOthersToContribute: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("missing neighbouringLandRights is invalid", () => {
      const data = {
        sharedContributions: { yesNo: "No" },
        disagreementAboutRightsYouExercise: { yesNo: "No" },
        rightsOverProperty: { yesNo: "No" },
        askedOthersToContribute: { yesNo: "No" },
        accessRestrictionAttempts: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'neighbouringLandRights'")
        )
      ).toBe(true);
    });

    test("missing all required fields is invalid", () => {
      const data = {};
      expect(validator(data)).toBe(false);
      const errorMessages = validator.errors.map((e) => e.message);
      expect(errorMessages).toContain(
        "must have required property 'neighbouringLandRights'"
      );
      expect(errorMessages).toContain(
        "must have required property 'sharedContributions'"
      );
    });
  });

  describe("Specialist issues validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/specialistIssues",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("valid specialist issues data passes", () => {
      const data = {
        dryRotEtcTreatment: { yesNo: "No" },
        containsAsbestos: { yesNo: "No" },
        japaneseKnotweed: {
          yesNo: "No",
          knotweedSurveyCarriedOut: { yesNo: "No" },
        },
        subsidenceOrStructuralFault: { yesNo: "No" },
        ongoingHealthOrSafetyIssue: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("missing japaneseKnotweed is invalid (required by overlay)", () => {
      const data = {};
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'japaneseKnotweed'")
        )
      ).toBe(true);
    });

    test("japaneseKnotweed missing knotweedSurveyCarriedOut is invalid", () => {
      const data = {
        japaneseKnotweed: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'knotweedSurveyCarriedOut'")
        )
      ).toBe(true);
    });

    test("knotweedSurveyCarriedOut No is valid without attachments", () => {
      const data = {
        japaneseKnotweed: {
          yesNo: "No",
          knotweedSurveyCarriedOut: { yesNo: "No" },
        },
      };
      expect(validator(data)).toBe(true);
    });

    test("knotweedSurveyCarriedOut Not known is valid without attachments", () => {
      const data = {
        japaneseKnotweed: {
          yesNo: "No",
          knotweedSurveyCarriedOut: { yesNo: "Not known" },
        },
      };
      expect(validator(data)).toBe(true);
    });

    test("knotweedSurveyCarriedOut Yes without attachments is invalid", () => {
      const data = {
        japaneseKnotweed: {
          yesNo: "No",
          knotweedSurveyCarriedOut: { yesNo: "Yes" },
        },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'attachments'")
        )
      ).toBe(true);
    });

    test("knotweedSurveyCarriedOut Yes with attachments is valid", () => {
      const data = {
        japaneseKnotweed: {
          yesNo: "No",
          knotweedSurveyCarriedOut: {
            yesNo: "Yes",
            attachments: "Attached",
          },
        },
      };
      expect(validator(data)).toBe(true);
    });

    test("knotweedSurveyCarriedOut Yes with To follow attachments is valid", () => {
      const data = {
        japaneseKnotweed: {
          yesNo: "No",
          knotweedSurveyCarriedOut: {
            yesNo: "Yes",
            attachments: "To follow",
          },
        },
      };
      expect(validator(data)).toBe(true);
    });

    test("japaneseKnotweed Yes with management plan and survey is valid", () => {
      const data = {
        japaneseKnotweed: {
          yesNo: "Yes",
          managementPlanInPlace: "Yes",
          attachments: "Attached",
          knotweedSurveyCarriedOut: {
            yesNo: "Yes",
            attachments: "Attached",
          },
        },
      };
      expect(validator(data)).toBe(true);
    });

    test("japaneseKnotweed Yes with management plan No does not require attachments", () => {
      const data = {
        japaneseKnotweed: {
          yesNo: "Yes",
          managementPlanInPlace: "No",
          knotweedSurveyCarriedOut: { yesNo: "No" },
        },
      };
      expect(validator(data)).toBe(true);
    });

    test("japaneseKnotweed Yes with management plan Yes without attachments is invalid", () => {
      const data = {
        japaneseKnotweed: {
          yesNo: "Yes",
          managementPlanInPlace: "Yes",
          knotweedSurveyCarriedOut: { yesNo: "No" },
        },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'attachments'")
        )
      ).toBe(true);
    });
  });

  describe("Alterations section validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/alterationsAndChanges",
        schemaId,
        ["ta6ed6"]
      );
    });

    const allNo = {
      hasStructuralAlterations: { yesNo: "No" },
      nonResidentialPurposes: { yesNo: "No" },
      planningPermissionBreaches: { yesNo: "No" },
      unresolvedPlanningIssues: { yesNo: "No" },
    };

    test("all No answers passes", () => {
      expect(validator(allNo)).toBe(true);
    });

    test("missing hasStructuralAlterations (5.1) is invalid", () => {
      const { hasStructuralAlterations, ...data } = allNo;
      expect(validator(data)).toBe(false);
    });

    test("5.1 Yes without alteration types and details (5.2a) is invalid", () => {
      expect(
        validator({ ...allNo, hasStructuralAlterations: { yesNo: "Yes" } })
      ).toBe(false);
    });

    test("5.1 Yes with types, details and the shared 5.2 block is valid", () => {
      expect(
        validator({
          ...allNo,
          hasStructuralAlterations: {
            yesNo: "Yes",
            alterationTypes: ["Extension", "Insulation"],
            details: "Rear extension 2019; loft insulation 2021",
            workCompleted: { yesNo: "Yes" },
            documents: "Attached",
            approvalsObtained: "Yes",
          },
        })
      ).toBe(true);
    });

    const withWorkCompleted = (workCompleted) => ({
      ...allNo,
      hasStructuralAlterations: {
        yesNo: "Yes",
        alterationTypes: ["Extension"],
        details: "Rear extension 2019",
        workCompleted,
        documents: "Attached",
        approvalsObtained: "Yes",
      },
    });

    test("workCompleted (5.2b) No without details is invalid", () => {
      expect(validator(withWorkCompleted({ yesNo: "No" }))).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'details'"))
      ).toBe(true);
    });

    test("workCompleted (5.2b) No with details is valid", () => {
      expect(
        validator(
          withWorkCompleted({
            yesNo: "No",
            details: "Roof tiles still to be completed",
          })
        )
      ).toBe(true);
    });

    test("the per-type alteration nodes are not required", () => {
      const required =
        getTransactionSchema(schemaId, ["ta6ed6"]).properties.propertyPack
          .properties.alterationsAndChanges.required;
      expect(required).not.toContain("extension");
      expect(required).not.toContain("windowReplacementsSince2002");
    });
  });

  describe("Water and drainage section validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/waterAndDrainage",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("valid water and drainage with mains passes", () => {
      const data = {
        water: {
          mainsWater: {
            yesNo: "Yes",
            supplier: "Thames Water",
            stopcock: { location: "Under the stairs" },
            waterMeter: { isSupplyMetered: "No" },
          },
        },
        drainage: {
          mainsFoulDrainage: { yesNo: "Yes", supplier: "Thames Water" },
          mainsSurfaceWaterDrainage: { yesNo: "Yes" },
          offMainsDrainageSystem: {},
        },
      };
      expect(validator(data)).toBe(true);
    });

    test("missing drainage is invalid", () => {
      const data = {
        water: {
          mainsWater: {
            yesNo: "Yes",
            supplier: "Thames Water",
            stopcock: { location: "Under the stairs" },
            waterMeter: { isSupplyMetered: "No" },
          },
        },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'drainage'"))
      ).toBe(true);
    });

    test("missing water is invalid", () => {
      const data = {
        drainage: {
          mainsFoulDrainage: { yesNo: "Yes", supplier: "Thames Water" },
          mainsSurfaceWaterDrainage: { yesNo: "Yes" },
          offMainsDrainageSystem: {},
        },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'water'"))
      ).toBe(true);
    });

    test("mainsFoulDrainage is an object with discriminator in merged schema", () => {
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      const mfd =
        schema.properties.propertyPack.properties.waterAndDrainage.properties
          .drainage.properties.mainsFoulDrainage;
      expect(mfd.type).toBe("object");
      expect(mfd.oneOf).toBeDefined();
      expect(mfd.discriminator).toBeDefined();
    });

    test("plant registered (EA registration) is NOT a TA6 ed6 field", () => {
      // The "registered with the Environment Agency or exempted?" question is a
      // BASPI item; it was previously mis-tagged ta6ed6Ref "11.7j" (the form's
      // 11.7(j) is actually the permit/documents supply-a-copy item). The stray
      // ref was unpopulated/unrendered, so it's removed from the TA6 overlay.
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      const plantRegistered =
        schema.properties.propertyPack.properties.waterAndDrainage.properties
          .drainage.properties.mainsFoulDrainage.oneOf[2].properties
          .offMainsDrainageSystem.properties.plantRegistered;
      expect(plantRegistered.ta6ed6Ref).toBeUndefined();
      expect(plantRegistered.properties.yesNo.ta6ed6Ref).toBeUndefined();
    });

    test("11.7(j) permit/documents renders last in each off-mains type", () => {
      // The form's 11.7(j) "supply a copy of any permit or documents relating
      // to your answers to 11.7(a)-(i)" is the final item of the off-mains
      // block. Since the renderer emits an object's own properties before its
      // conditional oneOf fields, permitDocuments lives at the END of each
      // system-type branch so it renders after the 11.7(a)-(e) date questions.
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      const offMains =
        schema.properties.propertyPack.properties.waterAndDrainage.properties
          .drainage.properties.mainsFoulDrainage.oneOf[2].properties
          .offMainsDrainageSystem;
      // no longer a top-level property
      expect(offMains.properties.permitDocuments).toBeUndefined();
      // present, and last, in every ta6ed6-rendered system type
      const ta6ed6Types = [
        "Septic tank",
        "Cesspit",
        "Sewerage treatment plant",
        "Other",
      ];
      ta6ed6Types.forEach((type) => {
        const branch = offMains.oneOf.find((b) =>
          b.properties.offMainsDrainageSystemType.enum.includes(type)
        );
        expect(branch.properties.permitDocuments).toBeDefined();
        expect(branch.properties.permitDocuments.ta6ed6Ref).toBe("11.7j");
        const keys = Object.keys(branch.properties);
        expect(keys[keys.length - 1]).toBe("permitDocuments");
      });
      // ...and the ref still isn't on plantRegistered's "Yes" attachments
      const plantRegisteredYes = offMains.properties.plantRegistered.oneOf.find(
        (branch) => branch.properties && branch.properties.attachments
      );
      expect(
        plantRegisteredYes.properties.attachments.ta6ed6Ref
      ).toBeUndefined();
    });

    test("offMainsDrainageSystem with per-branch permitDocuments is valid", () => {
      const data = {
        water: {
          mainsWater: {
            yesNo: "Yes",
            supplier: "Thames Water",
            stopcock: { location: "Kitchen" },
            waterMeter: { isSupplyMetered: "No" },
          },
        },
        drainage: {
          mainsFoulDrainage: {
            yesNo: "No",
            offMainsDrainageSystem: {
              offMainsDrainageSystemType: "Other",
              otherConnectedProperties: { yesNo: "No" },
              plantOnOtherLand: { yesNo: "No" },
              plantDrainsIntoWaterway: { yesNo: "Yes" },
              permitDocuments: "Attached",
            },
          },
          mainsSurfaceWaterDrainage: { yesNo: "Yes" },
        },
      };
      expect(validator(data)).toBe(true);
    });

    test("mainsFoulDrainage No with object is accepted", () => {
      const data = {
        water: {
          mainsWater: {
            yesNo: "Yes",
            supplier: "Thames Water",
            stopcock: { location: "Kitchen" },
            waterMeter: { isSupplyMetered: "No" },
          },
        },
        drainage: {
          mainsFoulDrainage: {
            yesNo: "No",
            offMainsDrainageSystem: {
              offMainsDrainageSystemType: "Other",
              otherConnectedProperties: { yesNo: "No" },
              plantOnOtherLand: { yesNo: "No" },
              plantRegistered: { yesNo: "No" },
              plantDrainsIntoWaterway: { yesNo: "Yes" },
            },
          },
          mainsSurfaceWaterDrainage: { yesNo: "Yes" },
        },
      };
      expect(validator(data)).toBe(true);
    });

    test("mainsSurfaceWaterDrainage is an object with yesNo discriminator", () => {
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      const mswd =
        schema.properties.propertyPack.properties.waterAndDrainage.properties
          .drainage.properties.mainsSurfaceWaterDrainage;
      expect(mswd.type).toBe("object");
      expect(mswd.properties.yesNo.enum).toEqual(["Yes", "No", "Not known"]);
    });
  });

  describe("Solar panels validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/electricity",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("solarPanels No is valid", () => {
      const data = {
        mainsElectricity: {
          yesNo: "Yes",
          supplier: "British Gas",
          electricityMeter: { location: "Hall cupboard", mpan: "1234567890123" },
        },
        solarPanels: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("solarPanels Yes without required sub-properties is invalid", () => {
      const data = {
        mainsElectricity: {
          yesNo: "Yes",
          supplier: "British Gas",
          electricityMeter: { location: "Hall cupboard", mpan: "1234567890123" },
        },
        solarPanels: { yesNo: "Yes" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'hotWaterOnly'")
        )
      ).toBe(true);
    });

    test("solarPanels Yes with all required sub-properties is valid", () => {
      const data = {
        mainsElectricity: {
          yesNo: "Yes",
          supplier: "British Gas",
          electricityMeter: { location: "Hall cupboard", mpan: "1234567890123" },
        },
        solarPanels: {
          yesNo: "Yes",
          hotWaterOnly: "No",
          yearInstalled: 2020,
          panelsOwnedOutright: { yesNo: "Yes" },
          panelProviderLease: { yesNo: "No" },
          maintenanceAgreement: { yesNo: "No" },
          photovoltaicBatteries: { yesNo: "No" },
          nationalGrid: { yesNo: "No" },
          installationCertificates: "Attached",
        },
      };
      expect(validator(data)).toBe(true);
    });

    test("solarPanels Yes with battery details and nationalGrid is valid", () => {
      const data = {
        mainsElectricity: {
          yesNo: "Yes",
          supplier: "British Gas",
          electricityMeter: { location: "Hall cupboard", mpan: "1234567890123" },
        },
        solarPanels: {
          yesNo: "Yes",
          hotWaterOnly: "No",
          yearInstalled: 2021,
          panelsOwnedOutright: { yesNo: "Yes" },
          panelProviderLease: { yesNo: "No" },
          maintenanceAgreement: { yesNo: "Yes", attachments: "Attached" },
          photovoltaicBatteries: {
            yesNo: "Yes",
            description: "Garage wall",
            details: "Tesla Powerwall 13.5kWh",
          },
          nationalGrid: { yesNo: "Yes", fitOrSegInPlace: { yesNo: "No" } },
          installationCertificates: "Attached",
        },
      };
      expect(validator(data)).toBe(true);
    });
  });

  describe("Notices section validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/notices",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("all No answers passes", () => {
      const data = {
        neighbourDevelopment: { yesNo: "No" },
        planningApplication: { yesNo: "No" },
        requiredMaintenance: { yesNo: "No" },
        listedBuildingApplication: { yesNo: "No" },
        infrastructureProject: { yesNo: "No" },
        partyWallAct: { yesNo: "No" },
        otherNotices: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("missing neighbourDevelopment is invalid", () => {
      const data = {
        planningApplication: { yesNo: "No" },
        partyWallAct: { yesNo: "No" },
        otherNotices: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'neighbourDevelopment'")
        )
      ).toBe(true);
    });

    test("neighbourDevelopment Yes with details is valid", () => {
      const data = {
        neighbourDevelopment: {
          yesNo: "Yes",
          details: "Neighbour planning a two-storey extension",
        },
        planningApplication: { yesNo: "No" },
        partyWallAct: { yesNo: "No" },
        otherNotices: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("partyWallAct Yes with details is valid", () => {
      const data = {
        neighbourDevelopment: { yesNo: "No" },
        planningApplication: { yesNo: "No" },
        partyWallAct: {
          yesNo: "Yes",
          details: "Party wall notice served by neighbour for loft conversion",
        },
        otherNotices: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });
  });

  describe("Environmental issues validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/environmentalIssues",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("all No answers passes", () => {
      const data = {
        flooding: {
          historicalFlooding: { hasBeenFlooded: "No" },
          floodDefences: { hasFloodDefences: "No" },
        },
        radon: {
          radonTest: { yesNo: "No" },
          remedialMeasuresOnConstruction: { yesNo: "No" },
        },
        greenDealScheme: { hasGreenDealLoan: { yesNo: "No" } },
      };
      expect(validator(data)).toBe(true);
    });

    test("missing flooding is invalid", () => {
      const data = {
        radon: {
          radonTest: { yesNo: "No" },
          remedialMeasuresOnConstruction: { yesNo: "No" },
        },
        greenDealScheme: { hasGreenDealLoan: { yesNo: "No" } },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'flooding'"))
      ).toBe(true);
    });

    test("historicalFlooding Yes with type and details is valid", () => {
      const data = {
        flooding: {
          historicalFlooding: {
            hasBeenFlooded: "Yes",
            typeOfFlooding: ["Surface water"],
            details: "Minor surface water flooding in 2020 winter storms",
          },
          floodDefences: { hasFloodDefences: "No" },
        },
        radon: {
          radonTest: { yesNo: "No" },
          remedialMeasuresOnConstruction: { yesNo: "No" },
        },
        greenDealScheme: { hasGreenDealLoan: { yesNo: "No" } },
      };
      expect(validator(data)).toBe(true);
    });

    test("floodDefences Yes with details is valid", () => {
      const data = {
        flooding: {
          historicalFlooding: { hasBeenFlooded: "No" },
          floodDefences: {
            hasFloodDefences: "Yes",
            details: "Flood barrier installed by EA in 2018",
          },
        },
        radon: {
          radonTest: { yesNo: "No" },
          remedialMeasuresOnConstruction: { yesNo: "No" },
        },
        greenDealScheme: { hasGreenDealLoan: { yesNo: "No" } },
      };
      expect(validator(data)).toBe(true);
    });
  });

  describe("Legal boundaries validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/legalBoundaries",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("uniform boundaries with all sides specified passes", () => {
      // The merged schema requires both uniformBoundaries and irregularBoundaries
      // (union of required arrays from base and overlay oneOf branches).
      // When areBoundariesUniform is "Yes", provide irregularBoundaries with yesNo: "No".
      const data = {
        ownership: {
          areBoundariesUniform: "Yes",
          uniformBoundaries: {
            left: "Seller",
            right: "Neighbour",
            rear: "Seller",
            front: "Not known",
          },
          irregularBoundaries: { yesNo: "No" },
        },
        haveBoundaryFeaturesMoved: { yesNo: "No" },
        flyingFreehold: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("missing ownership is invalid", () => {
      const data = {
        haveBoundaryFeaturesMoved: { yesNo: "No" },
        flyingFreehold: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'ownership'"))
      ).toBe(true);
    });

    test("missing haveBoundaryFeaturesMoved is invalid", () => {
      const data = {
        ownership: {
          areBoundariesUniform: "Yes",
          uniformBoundaries: {
            left: "Seller",
            right: "Seller",
            rear: "Seller",
            front: "Seller",
          },
          irregularBoundaries: { yesNo: "No" },
        },
        flyingFreehold: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'haveBoundaryFeaturesMoved'")
        )
      ).toBe(true);
    });

    test("boundaries Not applicable is valid", () => {
      // Even for "Not applicable", the merged schema requires uniformBoundaries
      // and irregularBoundaries due to required array union from overlays.
      const data = {
        ownership: {
          areBoundariesUniform: "Not applicable",
          uniformBoundaries: {
            left: "Not known",
            right: "Not known",
            rear: "Not known",
            front: "Not known",
          },
          irregularBoundaries: { yesNo: "No" },
        },
        haveBoundaryFeaturesMoved: { yesNo: "No" },
        flyingFreehold: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("haveBoundaryFeaturesMoved Yes with details is valid", () => {
      const data = {
        ownership: {
          areBoundariesUniform: "Yes",
          uniformBoundaries: {
            left: "Seller",
            right: "Neighbour",
            rear: "Shared",
            front: "Seller",
          },
          irregularBoundaries: { yesNo: "No" },
        },
        haveBoundaryFeaturesMoved: {
          yesNo: "Yes",
          details: "Rear fence moved by 30cm after storm damage",
        },
        flyingFreehold: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });
  });

  describe("Guarantees warranties and indemnity insurances validation", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator(
        "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances",
        schemaId,
        ["ta6ed6"]
      );
    });

    test("all No answers passes", () => {
      const data = {
        hasValidGuaranteesOrWarranties: "No",
        newHomeWarranty: { yesNo: "No" },
        dampProofingTreatment: { yesNo: "No" },
        timberRotOrInfestationTreatment: { yesNo: "No" },
        doubleGlazing: { yesNo: "No" },
        roofingWork: { yesNo: "No" },
        centralHeatingAndorPlumbing: { yesNo: "No" },
        subsidenceWork: { yesNo: "No" },
        insulation: { yesNo: "No" },
        otherGuarantees: { yesNo: "No" },
        outstandingClaimsOrApplications: { yesNo: "No" },
        breachOfTermsOrConditions: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("missing hasValidGuaranteesOrWarranties is invalid", () => {
      const data = {
        newHomeWarranty: { yesNo: "No" },
        dampProofingTreatment: { yesNo: "No" },
        timberRotOrInfestationTreatment: { yesNo: "No" },
        doubleGlazing: { yesNo: "No" },
        roofingWork: { yesNo: "No" },
        centralHeatingAndorPlumbing: { yesNo: "No" },
        subsidenceWork: { yesNo: "No" },
        insulation: { yesNo: "No" },
        otherGuarantees: { yesNo: "No" },
        outstandingClaimsOrApplications: { yesNo: "No" },
        breachOfTermsOrConditions: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'hasValidGuaranteesOrWarranties'")
        )
      ).toBe(true);
    });

    test("newHomeWarranty Yes with attachments is valid", () => {
      const data = {
        hasValidGuaranteesOrWarranties: "Yes",
        newHomeWarranty: { yesNo: "Yes", attachments: "Attached" },
        dampProofingTreatment: { yesNo: "No" },
        timberRotOrInfestationTreatment: { yesNo: "No" },
        doubleGlazing: { yesNo: "No" },
        roofingWork: { yesNo: "No" },
        centralHeatingAndorPlumbing: { yesNo: "No" },
        subsidenceWork: { yesNo: "No" },
        subsidenceWork: { yesNo: "No" },
        insulation: { yesNo: "No" },
        otherGuarantees: { yesNo: "No" },
        outstandingClaimsOrApplications: { yesNo: "No" },
        breachOfTermsOrConditions: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("newHomeWarranty Yes without attachments is invalid", () => {
      const data = {
        hasValidGuaranteesOrWarranties: "Yes",
        newHomeWarranty: { yesNo: "Yes" },
        dampProofingTreatment: { yesNo: "No" },
        timberRotOrInfestationTreatment: { yesNo: "No" },
        doubleGlazing: { yesNo: "No" },
        roofingWork: { yesNo: "No" },
        centralHeatingAndorPlumbing: { yesNo: "No" },
        subsidenceWork: { yesNo: "No" },
        subsidenceWork: { yesNo: "No" },
        insulation: { yesNo: "No" },
        otherGuarantees: { yesNo: "No" },
        outstandingClaimsOrApplications: { yesNo: "No" },
        breachOfTermsOrConditions: { yesNo: "No" },
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'attachments'"))
      ).toBe(true);
    });

    test("multiple guarantees with Yes answers all valid", () => {
      const data = {
        hasValidGuaranteesOrWarranties: "Yes",
        newHomeWarranty: { yesNo: "Yes", attachments: "Attached" },
        dampProofingTreatment: { yesNo: "Yes", attachments: "To follow" },
        timberRotOrInfestationTreatment: { yesNo: "No" },
        doubleGlazing: { yesNo: "Yes", attachments: "Attached" },
        roofingWork: { yesNo: "No" },
        centralHeatingAndorPlumbing: { yesNo: "No" },
        subsidenceWork: { yesNo: "No" },
        subsidenceWork: { yesNo: "No" },
        insulation: { yesNo: "No" },
        otherGuarantees: { yesNo: "No" },
        outstandingClaimsOrApplications: { yesNo: "No" },
        breachOfTermsOrConditions: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });
  });

  describe("Previously broken discriminator sections now compile", () => {
    // These sections previously failed AJV compilation because their
    // discriminated properties were not in the required array of each
    // oneOf branch. This has been fixed in combined.json.

    const sections = [
      "alterationsAndChanges",
      "notices",
      "waterAndDrainage",
      "electricity",
      "environmentalIssues",
      "legalBoundaries",
      "guaranteesWarrantiesAndIndemnityInsurances",
    ];

    test.each(sections)(
      "%s subschema validator compiles successfully",
      (section) => {
        const validator = getSubschemaValidator(
          `/propertyPack/${section}`,
          schemaId,
          ["ta6ed6"]
        );
        expect(typeof validator).toBe("function");
      }
    );

    test("full transaction validator compiles successfully", () => {
      const validator = getSubschemaValidator("", schemaId, ["ta6ed6"]);
      expect(typeof validator).toBe("function");
    });
  });

  describe("Full transaction validation with ta6ed6", () => {
    let validator;

    beforeAll(() => {
      validator = getSubschemaValidator("", schemaId, ["ta6ed6"]);
    });

    test("example transaction is invalid under ta6ed6 (missing required sections)", () => {
      const exampleTransaction = require("../../examples/v3/exampleTransaction.json");
      expect(validator(exampleTransaction)).toBe(false);
      const errorMessages = validator.errors.map((e) => e.message);
      expect(errorMessages).toContain(
        "must have required property 'consents'"
      );
    });

    test("transaction missing required propertyPack section is invalid", () => {
      const transaction = buildMinimalTransaction();
      delete transaction.propertyPack.parking;
      expect(validator(transaction)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'parking'"))
      ).toBe(true);
    });
  });

  describe("Role / seller's capacity (TA6 1.4)", () => {
    test("ta6ed6 reduces capacity to the form's four options with form labels", () => {
      let capacity;
      const walk = (node) => {
        if (!node || typeof node !== "object") return;
        if (node.capacity && node.capacity.ta6ed6Ref === "1.4") {
          capacity = node.capacity;
        }
        for (const key of Object.keys(node)) walk(node[key]);
      };
      walk(ta6ed6Overlay);
      expect(capacity).toBeDefined();
      // Narrowed to the form's roles and relabelled to its wording. Capacity is
      // collected in the FE personal-details step (not NTS/MI), so this is not a
      // re-validation concern — new sellers simply pick from this set. "Company
      // Director" is kept (relabelled "Seller (Company)") because it triggers the
      // form's company-details block (1.6.x). "Assistant"/"Other"/"Mortgagee in
      // Possession"/"Company Secretary" are dropped.
      expect(capacity.enum).toEqual([
        "Legal Owner",
        "Company Director",
        "Personal Representative for a Deceased Owner",
        "Under Power of Attorney",
        "Trustee",
      ]);
      expect(capacity.enumNames).toEqual([
        "Seller (Private individual)",
        "Seller (Company)",
        "Executor(s)/Administrator(s)",
        "Attorney(s)",
        "Trustee(s)",
      ]);
    });
  });
});

/**
 * Builds a minimal transaction object for testing missing-section validation.
 * Note: this transaction may not fully pass validation due to known schema
 * merge conflicts (e.g. insurance.isInsured type/enum conflict, capacity
 * enum mismatch), but it contains all required propertyPack sections so
 * we can test that removing one is detected.
 */
function buildMinimalTransaction() {
  return {
    transactionId: "test-ta6ed6",
    status: "For sale",
    participants: [
      {
        role: "Seller",
        name: { firstName: "Jane", lastName: "Doe" },
        email: "jane@example.com",
        address: { line1: "1 Test St", postcode: "SW1A 1AA" },
        organisation: "Self",
        sellersCapacity: { capacity: "Legal Owner" },
      },
      {
        role: "Seller's Conveyancer",
        name: { firstName: "John", lastName: "Law" },
        email: "john@law.co.uk",
        address: { line1: "2 Law Lane", postcode: "EC1A 1BB" },
        organisation: "Law Firm LLP",
        organisationReference: "REF001",
      },
    ],
    propertyPack: {
      address: { line1: "1 Test St", postcode: "SW1A 1AA" },
      parking: {
        parkingArrangements: ["Driveway"],
        controlledParking: { yesNo: "No" },
        electricVehicleChargingPoint: { yesNo: "No" },
      },
      disputesAndComplaints: {
        hasDisputesAndComplaints: { yesNo: "No" },
        leadingToDisputesAndComplaints: { yesNo: "No" },
      },
      alterationsAndChanges: {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: { yesNo: "No" },
        loftConversion: { yesNo: "No" },
        garageConversion: { yesNo: "No" },
        removalOfInternalWalls: { yesNo: "No" },
        removalOfChimneyBreast: { yesNo: "No" },
        insulation: { yesNo: "No" },
        otherBuildingWorksOrChangesToTheProperty: { yesNo: "No" },
        changeOfUse: { yesNo: "No" },
        nonResidentialPurposes: { yesNo: "No" },
        planningPermissionBreaches: { yesNo: "No" },
        unresolvedPlanningIssues: { yesNo: "No" },
      },
      listingAndConservation: {
        isListed: { yesNo: "No" },
        isConservationArea: { yesNo: "No" },
        hasTreePreservationOrder: { yesNo: "No" },
      },
      notices: {
        neighbourDevelopment: { yesNo: "No" },
        planningApplication: { yesNo: "No" },
        requiredMaintenance: { yesNo: "No" },
        listedBuildingApplication: { yesNo: "No" },
        infrastructureProject: { yesNo: "No" },
        partyWallAct: { yesNo: "No" },
        otherNotices: { yesNo: "No" },
      },
      specialistIssues: {},
      waterAndDrainage: {
        water: {
          mainsWater: {
            yesNo: "Yes",
            supplier: "Thames Water",
            stopcock: { location: "Under the stairs" },
            waterMeter: { isSupplyMetered: "No" },
          },
        },
        drainage: {
          mainsFoulDrainage: { yesNo: "Yes", supplier: "Thames Water" },
          mainsSurfaceWaterDrainage: { yesNo: "Yes" },
          offMainsDrainageSystem: {},
        },
      },
      electricity: {
        mainsElectricity: {
          yesNo: "Yes",
          supplier: "British Gas",
          electricityMeter: { location: "Hall cupboard" },
        },
        solarPanels: { yesNo: "No" },
      },
      heating: {
        heatingTypes: ["Central heating"],
        heatingOtherDetails: "Gas central heating",
        heatingSystemInstalledDate: "2015",
        boilerInstalledDate: "2015",
        heatingReplacementOtherThanBoiler: "No",
        heatingComplianceDocs: "None",
        heatingInspectionReport: "None",
        boilerWorking: "Yes",
        boilerLastServicedYear: "2024",
        multipleHeatingSystemsAttachment: "Attached",
      },
      connectivity: {
        telephone: { yesNo: "Yes", supplier: "BT" },
        broadband: { typeOfConnection: "None" },
      },
      insurance: {
        isInsured: "Yes",
        difficultiesObtainingInsurance: { yesNo: "No" },
        insuranceClaims: { yesNo: "No" },
      },
      rightsAndInformalArrangements: {
        neighbouringLandRights: { yesNo: "No" },
        sharedContributions: { yesNo: "No" },
        disagreementAboutRightsYouExercise: { yesNo: "No" },
        rightsOverProperty: { yesNo: "No" },
        askedOthersToContribute: { yesNo: "No" },
        accessRestrictionAttempts: { yesNo: "No" },
      },
      environmentalIssues: {
        flooding: {
          historicalFlooding: { hasBeenFlooded: "No" },
          floodDefences: { hasFloodDefences: "No" },
        },
        radon: { yesNo: "No" },
        radonRemedialMeasures: { yesNo: "No" },
        greenDealScheme: { yesNo: "No" },
        japaneseKnotweed: { yesNo: "No" },
        japaneseKnotweedSurvey: { yesNo: "No" },
      },
      legalBoundaries: {
        ownership: {
          areBoundariesUniform: "Yes",
          uniformBoundaries: {
            left: "Seller",
            right: "Neighbour",
            rear: "Seller",
            front: "Not known",
          },
          irregularBoundaries: { yesNo: "No" },
        },
        haveBoundaryFeaturesMoved: { yesNo: "No" },
        flyingFreehold: { yesNo: "No" },
      },
      servicesCrossing: {
        pipesWiresCablesDrainsToProperty: { yesNo: "No" },
        pipesWiresCablesDrainsFromProperty: { yesNo: "No" },
        formalOrInformalAgreements: { yesNo: "No" },
      },
      electricalWorks: {
        testedByQualifiedElectrician: { yesNo: "No" },
        electricalWorkSince2005: { yesNo: "No" },
      },
      guaranteesWarrantiesAndIndemnityInsurances: {
        hasValidGuaranteesOrWarranties: "No",
      },
      occupiers: {
        sellerLivesAtProperty: { yesNo: "Yes" },
        othersAged17OrOver: { hasOthersAged17OrOver: "No" },
        vacantPossession: { soldWithVacantPossession: "Yes" },
        occupiersAged17OrOverAgreedToSignAndVacate: { yesNo: "Yes" },
        tenancyAgreementsIfNotVacantPossession: "Attached",
      },
      completionAndMoving: {
        sellerWillEnsure: {
          removeRubbish: true,
          replaceLightFittings: true,
          takeReasonableCare: true,
          leaveKeys: true,
        },
        sufficientToRepayAllMortgages: { yesNo: "Yes" },
      },
      confirmationOfAccuracyByOwners: {
        confirmInformationIsAccurate: true,
      },
      additionalInformation: {},
    },
  };
}

describe("TA6 Edition 6 'Not available' attachment options match the form", () => {
  const schema = getTransactionSchema(schemaId, ["ta6ed6"]);

  // Returns the document/attachment node(s) (enum includes "Attached") carrying
  // a given ta6ed6Ref. A ref can sit on both the yes/no question and its
  // attachment, so we filter to the node that actually holds the upload enum.
  const attachmentNodesByRef = (ref) => {
    const matches = [];
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (
        node.ta6ed6Ref === ref &&
        Array.isArray(node.enum) &&
        node.enum.includes("Attached")
      ) {
        matches.push(node);
      }
      (Array.isArray(node) ? node : Object.values(node)).forEach(walk);
    };
    walk(schema);
    return matches;
  };

  // The TA6 6th-edition form DOES offer "Not available" on these document
  // questions — 5.2(c) building works,
  // 5.6(h) solar certificate and 15.1 consents — so the overlay must not
  // reduce it away. Guards against re-introducing the over-removal.
  test.each([
    "5.2c",
    "5.6h",
    "15.1.1",
  ])("%s keeps 'Not available' (it is offered on the form)", (ref) => {
    const nodes = attachmentNodesByRef(ref);
    expect(nodes.length).toBeGreaterThan(0);
    nodes.forEach((node) => expect(node.enum).toContain("Not available"));
  });

  // The form offers ONLY "Attached"/"To follow" on the electrical-work and
  // heating-service document questions, so the overlay correctly reduces these.
  test.each(["11.2.2", "11.3", "11.4g"])(
    "%s excludes 'Not available' (form offers only Attached/To follow)",
    (ref) => {
      const nodes = attachmentNodesByRef(ref);
      expect(nodes.length).toBeGreaterThan(0);
      nodes.forEach((node) =>
        expect(node.enum).toEqual(["Attached", "To follow"])
      );
    }
  );
});
