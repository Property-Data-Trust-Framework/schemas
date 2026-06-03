const {
  getTransactionSchema,
  getSubschemaValidator,
} = require("../../../index.js");
const ta6ed6Overlay = require("../../schemas/v3/overlays/ta6ed6.json");

const schemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

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
      expect(required).toContain("windowReplacementsSince2002");
      expect(required).toContain("hasAddedConservatory");
      expect(required).toContain("extension");
      expect(required).toContain("loftConversion");
      expect(required).toContain("garageConversion");
      expect(required).toContain("removalOfInternalWalls");
      expect(required).toContain("removalOfChimneyBreast");
      expect(required).toContain("insulation");
      expect(required).toContain("otherBuildingWorksOrChangesToTheProperty");
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
      expect(required).toContain("heatingSystem");
      expect(required).toContain("otherHeatingFeatures");
      expect(required).toContain("multipleHeatingSystems");
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

    test("valid heating data passes", () => {
      const data = {
        heatingSystem: { heatingType: "None" },
        otherHeatingFeatures: ["None"],
        multipleHeatingSystems: "Not applicable",
      };
      expect(validator(data)).toBe(true);
    });

    test("missing heatingSystem is invalid", () => {
      const data = {
        otherHeatingFeatures: {},
        multipleHeatingSystems: {},
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'heatingSystem'"))
      ).toBe(true);
    });

    test("missing otherHeatingFeatures is invalid", () => {
      const data = {
        heatingSystem: { heatingType: "None" },
        multipleHeatingSystems: {},
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) =>
          e.message.includes("'otherHeatingFeatures'")
        )
      ).toBe(true);
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

    test("all No answers passes", () => {
      const data = {
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
      };
      expect(validator(data)).toBe(true);
    });

    test("missing extension is invalid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
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
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'extension'"))
      ).toBe(true);
    });

    test("extension Yes without details is invalid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: { yesNo: "Yes" },
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
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'details'"))
      ).toBe(true);
    });

    test("extension Yes with details is valid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: {
          yesNo: "Yes",
          details: "Single storey rear extension built 2018",
        },
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
      };
      expect(validator(data)).toBe(true);
    });

    test("extension Yes with full details including nested discriminators is valid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: {
          yesNo: "Yes",
          details: "Single storey rear extension built 2018",
          workCompleted: { yesNo: "Yes" },
          documents: "Attached",
          planningPermission: { yesNo: "Yes", attachments: "Attached" },
          buildingRegApproval: { yesNo: "Yes", attachments: "Attached" },
        },
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
      };
      expect(validator(data)).toBe(true);
    });

    test("workCompleted No without details is invalid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: {
          yesNo: "Yes",
          details: "Extension built 2020",
          workCompleted: { yesNo: "No" },
        },
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
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'details'"))
      ).toBe(true);
    });

    test("workCompleted No with details is valid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: {
          yesNo: "Yes",
          details: "Extension built 2020",
          workCompleted: {
            yesNo: "No",
            details: "Roof tiles still to be completed",
          },
        },
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
      };
      expect(validator(data)).toBe(true);
    });

    test("windowReplacementsSince2002 Yes with details is valid", () => {
      const data = {
        windowReplacementsSince2002: {
          yesNo: "Yes",
          details: "All windows replaced with double glazing in 2015",
        },
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
      };
      expect(validator(data)).toBe(true);
    });

    test("hasAddedConservatory Yes without details is invalid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "Yes" },
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
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'details'"))
      ).toBe(true);
    });

    test("multiple alteration types with Yes answers all valid", () => {
      const data = {
        windowReplacementsSince2002: {
          yesNo: "Yes",
          details: "Double glazing throughout",
        },
        hasAddedConservatory: {
          yesNo: "Yes",
          details: "Rear conservatory 2019",
        },
        extension: { yesNo: "No" },
        loftConversion: {
          yesNo: "Yes",
          details: "Loft converted to bedroom 2017",
          workCompleted: { yesNo: "Yes" },
          planningPermission: {
            yesNo: "Not required",
            details: "Permitted development rights applied",
          },
          buildingRegApproval: {
            yesNo: "Yes",
            attachments: "Attached",
          },
        },
        garageConversion: { yesNo: "No" },
        removalOfInternalWalls: { yesNo: "No" },
        removalOfChimneyBreast: { yesNo: "No" },
        insulation: { yesNo: "No" },
        otherBuildingWorksOrChangesToTheProperty: { yesNo: "No" },
        changeOfUse: { yesNo: "No" },
        nonResidentialPurposes: { yesNo: "No" },
        planningPermissionBreaches: { yesNo: "No" },
        unresolvedPlanningIssues: { yesNo: "No" },
      };
      expect(validator(data)).toBe(true);
    });

    test("extension planningPermission Yes without attachments is invalid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: {
          yesNo: "Yes",
          details: "Rear extension 2020",
          planningPermission: { yesNo: "Yes" },
          buildingRegApproval: { yesNo: "Yes", attachments: "Attached" },
        },
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
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'attachments'"))
      ).toBe(true);
    });

    test("extension planningPermission Yes with attachments is valid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: {
          yesNo: "Yes",
          details: "Rear extension 2020",
          planningPermission: { yesNo: "Yes", attachments: "Attached" },
          buildingRegApproval: { yesNo: "Yes", attachments: "Attached" },
        },
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
      };
      expect(validator(data)).toBe(true);
    });

    test("extension planningPermission No without details is invalid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: {
          yesNo: "Yes",
          details: "Rear extension 2020",
          planningPermission: { yesNo: "No" },
          buildingRegApproval: { yesNo: "No", details: "Exempt from regs" },
        },
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
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'details'"))
      ).toBe(true);
    });

    test("extension planningPermission No with details is valid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: {
          yesNo: "Yes",
          details: "Rear extension 2020",
          planningPermission: {
            yesNo: "No",
            details: "Permitted development rights applied",
          },
          buildingRegApproval: {
            yesNo: "No",
            details: "Exempt from building regulations",
          },
        },
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
      };
      expect(validator(data)).toBe(true);
    });

    test("extension planningPermission Not required without details is invalid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: {
          yesNo: "Yes",
          details: "Rear extension 2020",
          planningPermission: { yesNo: "Not required" },
          buildingRegApproval: {
            yesNo: "Not required",
            details: "Work exempt",
          },
        },
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
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'details'"))
      ).toBe(true);
    });

    test("extension buildingRegApproval Yes without attachments is invalid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: {
          yesNo: "Yes",
          details: "Rear extension 2020",
          planningPermission: { yesNo: "Yes", attachments: "Attached" },
          buildingRegApproval: { yesNo: "Yes" },
        },
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
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'attachments'"))
      ).toBe(true);
    });

    test("extension buildingRegApproval No without details is invalid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: {
          yesNo: "Yes",
          details: "Rear extension 2020",
          planningPermission: {
            yesNo: "No",
            details: "Permitted development",
          },
          buildingRegApproval: { yesNo: "No" },
        },
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
      };
      expect(validator(data)).toBe(false);
      expect(
        validator.errors.some((e) => e.message.includes("'details'"))
      ).toBe(true);
    });

    test("extension buildingRegApproval Not required with details is valid", () => {
      const data = {
        windowReplacementsSince2002: { yesNo: "No" },
        hasAddedConservatory: { yesNo: "No" },
        extension: {
          yesNo: "Yes",
          details: "Rear extension 2020",
          planningPermission: {
            yesNo: "Not required",
            details: "Permitted development rights applied",
          },
          buildingRegApproval: {
            yesNo: "Not required",
            details: "Work exempt from building regulations",
          },
        },
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
      };
      expect(validator(data)).toBe(true);
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

    test("plant registered yesNo carries TA6 edition 6 ref", () => {
      const schema = getTransactionSchema(schemaId, ["ta6ed6"]);
      const plantRegistered =
        schema.properties.propertyPack.properties.waterAndDrainage.properties
          .drainage.properties.mainsFoulDrainage.oneOf[2].properties
          .offMainsDrainageSystem.properties.plantRegistered;
      expect(plantRegistered.ta6ed6Ref).toBe("11.7j");
      expect(plantRegistered.properties.yesNo.ta6ed6Ref).toBe("11.7j");
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
