const jp = require("jsonpointer");
const fs = require("fs");

const {
  getTransactionSchema,
  getSubschema,
  isPathValid,
  getValidator,
  getSubschemaValidator,
  getTitleAtPath,
} = require("../../../index.js");

const exampleTransaction = require("../../examples/v3/exampleTransaction.json");

const schemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";
// const validator = getValidator(schemaId);
const v3TransactionSchema = getTransactionSchema(schemaId);

test("exports a property pack schema, v3 with no overlay by default", () => {
  const testSchema = getTransactionSchema(schemaId);
  // expect(testSchema.$id).toEqual(
  //   "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json"
  // );
  expect(testSchema.properties.propertyPack.properties.baspi5Ref).toEqual(
    undefined
  );
});

test("sample is valid BASPI", () => {
  const testSchema = getTransactionSchema(schemaId, ["baspiV4"]);
  expect(testSchema.properties.propertyPack.baspi4Ref).toEqual("0");
  const validator = getValidator(schemaId, ["baspiV4"]);
  const isValid = validator(exampleTransaction);
  expect(isValid).toBe(true);
});

test("sample is valid NTS", () => {
  const validator = getValidator(schemaId, ["nts2023"]);
  const isValid = validator(exampleTransaction);
  expect(isValid).toBe(true);
});

test("sample is not valid nts2025 out of the box", () => {
  const validator = getValidator(schemaId, ["nts2025"]);
  const isValid = validator(exampleTransaction);
  expect(isValid).toBe(false);
  expect(validator.errors.length).toBe(3);
  expect(validator.errors.map((e) => e.message)).toEqual([
    "must have required property 'transferFees'",
    "must have required property 'constructionType'",
    "must have required property 'floodDefences'",
  ]);
});

test("sample is valid nts2025 with some additions", () => {
  const validator = getValidator(schemaId, ["nts2025"]);
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  clonedExampleTransaction.propertyPack.ownership.ownershipsToBeTransferred[0].leaseholdInformation.serviceCharge.transferFees =
    {
      yesNo: "Yes",
      details: "Transfer fees exist",
    };
  clonedExampleTransaction.propertyPack.typeOfConstruction.isStandardForm = {
    yesNo: "Yes",
    constructionType: "Timber frame",
  };
  clonedExampleTransaction.propertyPack.environmentalIssues.flooding.floodDefences =
    {
      hasFloodDefences: "Yes",
      details: "Flood defences exist",
    };

  const isValid = validator(clonedExampleTransaction);
  expect(isValid).toBe(true);
});

test("sample is not valid NTSL (lettings)", () => {
  const validator = getValidator(schemaId, ["ntsl2023"]);
  const isValid = validator(exampleTransaction);
  expect(isValid).toBe(false);
  expect(validator.errors[0].message).toBe(
    "must have required property 'lettingInformation'"
  );
});

test("sample is valid NTSL if we change it accordingly", () => {
  const validator = getValidator(schemaId, ["ntsl2023"]);
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  clonedExampleTransaction.propertyPack.lettingInformation = {
    rent: 3500,
    rentFrequency: "Monthly",
    securityDeposit: 5000,
  };
  delete clonedExampleTransaction.propertyPack.priceInformation;
  delete clonedExampleTransaction.propertyPack.ownership;
  const isValid = validator(clonedExampleTransaction);
  expect(isValid).toBe(true);
});

test("invalid sample is invalid", () => {
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  delete clonedExampleTransaction.propertyPack.notices;
  const validator = getValidator(schemaId, ["baspiV4"]);
  const isValid = validator(clonedExampleTransaction);
  expect(isValid).toBe(false);
});

test("sample with missing dependent required fields is invalid", () => {
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  clonedExampleTransaction.propertyPack.ownership.ownershipsToBeTransferred[0].ownershipType =
    "leasehold";
  const validator = getValidator(schemaId);
  const isValid = validator(clonedExampleTransaction);
  expect(isValid).toBe(false);
});

test("sample with missing dependent required fields with NTS overlay is invalid", () => {
  // Previously a required field was missing from the NTS overlay
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  clonedExampleTransaction.propertyPack.ownership.ownershipsToBeTransferred[0].leaseholdInformation =
    undefined;
  const validator = getValidator(schemaId, ["nts2023"]);
  const isValid = validator(clonedExampleTransaction);
  expect(isValid).toBe(false);
});

test("correctly gets a top level subschema", () => {
  const subschema = getSubschema("/propertyPack");
  expect(subschema.title).toBe("Property Pack");
});

test("correctly identifies a valid path", () => {
  const isValid = isPathValid("/propertyPack");
  expect(isValid).toBe(true);
});

test("correctly identifies an undefined invalid path", () => {
  const isValid = isPathValid("/propertyPack/materialItems");
  expect(isValid).toBe(false);
});

test("correctly identifies an error generating invalid path", () => {
  const isValid = isPathValid(
    "/propertyPack/materialItems/someProperty/item",
    schemaId
  );
  expect(isValid).toBe(false);
});

test("correctly identifies an array invalid path", () => {
  const isValid = isPathValid("/propertyPack/1/item");
  expect(isValid).toBe(false);
});

test("correctly gets a subschema", () => {
  const subschema = getSubschema("/propertyPack/notices", schemaId);
  expect(subschema.title).toBe("Notices which Affect the Property");
});

test("correctly gets a subschema through an arrays element", () => {
  const subschema = getSubschema(
    "/propertyPack/titlesToBeSold/0/registerExtract",
    schemaId
  );
  expect(Object.keys(subschema.properties)).toEqual([
    "ocSummaryData",
    "ocRegisterData",
  ]);
});

test("correctly gets a subschema through a dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/delayFactors/hasDelayFactors/details",
    schemaId
  );
  expect(subschema.title).toBe(
    "Provide details and likely timescale for delay"
  );
});

test("correctly gets another subschema through a dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/ownership/ownershipsToBeTransferred/0/leaseholdInformation/leaseTerm/lengthOfLeaseInYears",
    schemaId
  );
  expect(subschema.title).toBe("Length of lease (years)");
});

test("correctly gets yet another subschema through a dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/ownership/ownershipsToBeTransferred/0/leaseholdInformation/groundRent/rentSubjectToIncrease/rentIncreaseCalculated"
  );
  expect(subschema.title).toBe("How is the increase calculated?");
});

test("correctly gets yet, yet another subschema through a dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/listingAndConservation/isConservationArea/yesNo"
  );
  expect(subschema.type).toBe("string");
  expect(subschema.enum).toStrictEqual(["Yes", "No", "Not known"]);
});

test("correctly gets yet, yet, yet another subschema through a second item dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/environmentalIssues/flooding/historicalFlooding/typeOfFlooding"
  );
  expect(subschema.type).toBe("array");
});

test("correctly gets yes another subschema but through a non-baspi oneOf structure", () => {
  const subschema = getSubschema(
    "/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/restrictionDetails/restrictionEntry/chargeRestriction/entryDetails/entryText"
  );
  expect(subschema).toEqual({ type: "string" });
});

test("correctly gets yes another subschema but through a non-baspi oneOf structure with array option", () => {
  const subschema = getSubschema(
    "/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/restrictionDetails/restrictionEntry/0/chargeRestriction/entryDetails/entryText"
  );
  expect(subschema).toEqual({ type: "string" });
});

test("correctly resolves properties inside nested oneOf branches", () => {
  // attachments is at japaneseKnotweed.oneOf[1].oneOf[1].properties.attachments
  const subschema = getSubschema(
    "/propertyPack/specialistIssues/japaneseKnotweed/attachments"
  );
  expect(subschema).toBeDefined();
  expect(subschema.type).toBe("string");
  expect(subschema.enum).toContain("To follow");
  expect(subschema.enum).toContain("Attached");
});

test("isPathValid returns true for nested oneOf properties", () => {
  expect(
    isPathValid("/propertyPack/specialistIssues/japaneseKnotweed/attachments")
  ).toBe(true);
  // knotweedSurveyCarriedOut.attachments is also nested in a oneOf
  expect(
    isPathValid(
      "/propertyPack/specialistIssues/japaneseKnotweed/knotweedSurveyCarriedOut/attachments"
    )
  ).toBe(true);
});

test("isPathValid returns false for non-existent paths in nested oneOf", () => {
  expect(
    isPathValid(
      "/propertyPack/specialistIssues/japaneseKnotweed/nonExistentField"
    )
  ).toBe(false);
});

test("correctly gets an overlaid enum in a subschema", () => {
  const subschema = getSubschema(
    "/propertyPack/electricity/mainsElectricity/yesNo",
    schemaId,
    ["nts2023"]
  );
  expect(subschema.enum).toEqual(["Yes", "No"]);
});

test("correctly gets a subschema with multiple overlays", () => {
  const subschema = getSubschema(
    "/propertyPack/parking/parkingArrangements",
    schemaId,
    ["baspiV5", "ta6ed4"]
  );
  expect(subschema.baspi5Ref).toBe("A1.6.0");
  expect(subschema.ta6Ref).toBe("9.1");
});

test("correctly gets a subschema validator which is already cached", () => {
  const validator = getSubschemaValidator(
    "/propertyPack/energyEfficiency/certificate"
  );
  expect(validator).not.toBeNull();
  const anotherValidator = getSubschemaValidator(
    "/propertyPack/energyEfficiency/certificate"
  );
  expect(anotherValidator).not.toBeNull();
});

test("correctly gets a subschema validator for a TA6 overlay", () => {
  const path = "/propertyPack";
  const data = jp.get(exampleTransaction, path);
  const validator = getSubschemaValidator(path, exampleTransaction.$schema, [
    "ta6ed4",
  ]);
  let isValid = validator(data);
  expect(isValid).toBe(true);
});

test("correctly gets a subschema validator for a TA7 overlay", () => {
  const path = "/propertyPack";
  const data = jp.get(exampleTransaction, path);
  const validator = getSubschemaValidator(path, exampleTransaction.$schema, [
    "ta7ed3",
  ]);
  let isValid = validator(data);
  expect(isValid).toBe(false);
});

test("correctly gets a subschema validator for a TA10 overlay", () => {
  const path = "/propertyPack";
  const data = jp.get(exampleTransaction, path);
  const validator = getSubschemaValidator(path, exampleTransaction.$schema, [
    "ta10ed3",
  ]);
  let isValid = validator(data);
  expect(isValid).toBe(false);
});

test("correctly gets a subschema validator for a TA6 overlay which validates", () => {
  const path =
    "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances/subsidenceWork";
  const data = { yesNo: "Yes" };
  const validator = getSubschemaValidator(path, exampleTransaction.$schema, [
    "ta6ed4",
  ]);
  let isValid = validator(data);
  expect(isValid).toBe(false);
  expect(validator.errors[0].message).toBe(
    "must have required property 'attachments'"
  );
});

test("correctly gets a subschema validator for a TA6 overlay which validates with non-TA6 field missing", () => {
  const path = "/propertyPack";
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  const data = jp.get(exampleTransaction, path);
  data.uprn = undefined;
  const validator = getSubschemaValidator(
    path,
    clonedExampleTransaction.$schema,
    ["ta6ed4"]
  );
  let isValid = validator(data);
  expect(isValid).toBe(true);
});

test("correctly gets a subschema validator for a TA6 overlay which validates with non-TA6 section missing", () => {
  const path = "/propertyPack";
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  const data = jp.get(clonedExampleTransaction, path);
  data.smartHomeSystems = undefined;
  const validator = getSubschemaValidator(path, exampleTransaction.$schema, [
    "ta6ed4",
  ]);
  let isValid = validator(data);
  expect(isValid).toBe(true);
});

test("correctly gets a subschema validator for a TA6 overlay which fails to validate with BASPI/TA6 section missing", () => {
  const path = "/propertyPack";
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  const data = jp.get(clonedExampleTransaction, path);
  data.waterAndDrainage = {};
  const validator = getSubschemaValidator(path, exampleTransaction.$schema, [
    "ta6ed4",
  ]);
  let isValid = validator(data);
  expect(isValid).toBe(false);
});

test("correctly gets a subschema validator for an NTS overlay", () => {
  const path = "/propertyPack";
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  const data = jp.get(clonedExampleTransaction, path);
  const validator = getSubschemaValidator(path, exampleTransaction.$schema, [
    "nts2023",
  ]);
  let isValid = validator(data);
  expect(isValid).toBe(true);
});

test("correctly gets a subschema validator for an TA7 overlay", () => {
  const path = "/propertyPack";
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  const data = jp.get(clonedExampleTransaction, path);
  const validator = getSubschemaValidator(path, exampleTransaction.$schema, [
    "ta7ed3",
  ]);
  let isValid = validator(data);
  expect(isValid).toBe(false);
});

test("correctly gets a subschema validator which validates", () => {
  const path = "/propertyPack/notices";
  const validator = getSubschemaValidator(path);
  const data = jp.get(exampleTransaction, path);
  expect(data.neighbourDevelopment.yesNo).toBe("No");
  let isValid = validator(data);
  expect(isValid).toBe(true);
  data.neighbourDevelopment.yesNo = "Invalid string";
  isValid = validator(data);
  expect(isValid).toBe(false);
});

test("correctly gets titles across schemas, arrays and non-existient title properties", () => {
  expect(
    getTitleAtPath(
      v3TransactionSchema,
      "/propertyPack/ownership/ownershipsToBeTransferred/0/ownershipType"
    )
  ).toBe("What type of ownership is the property?");

  expect(
    getTitleAtPath(
      v3TransactionSchema,
      "/propertyPack/ownership/ownershipsToBeTransferred/0/leaseholdInformation/leaseTerm/lengthOfLeaseInYears"
    )
  ).toBe("Length of lease (years)");

  expect(getTitleAtPath(v3TransactionSchema, "/propertyPack/invalidPath")).toBe(
    undefined
  );

  expect(
    getTitleAtPath(
      v3TransactionSchema,
      "/propertyPack/titlesToBeSold/0/registerExtract"
    )
  ).toBe("HMLR Official Copy Register Extract");

  expect(
    getTitleAtPath(
      v3TransactionSchema,
      "/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/propertyAddress"
    )
  ).toBe("Property address");

  expect(
    getTitleAtPath(
      v3TransactionSchema,
      "/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/invalidProp"
    )
  ).toBe(undefined);

  expect(
    getTitleAtPath(
      v3TransactionSchema,
      "/propertyPack/energyEfficiency/certificate/currentEnergyRating"
    )
  ).toBe("Current energy efficiency rating");

  expect(
    getTitleAtPath(
      v3TransactionSchema,
      "/propertyPack/occupiers/othersAged17OrOver/aged17OrOverNames"
    )
  ).toBe("Please provide their full names and ages.");
});
test("validates a valid contract", () => {
  const path = "/contracts";
  const data = jp.get(exampleTransaction, path);
  const validator = getSubschemaValidator(path, exampleTransaction.$schema);
  const isValid = validator(data);
  expect(isValid).toBe(true);
});

test("ntsl2025 requires parking and listingAndConservation fields", () => {
  // This test validates that the ntsl2025 overlay correctly enforces required fields
  // for the parking and listingAndConservation sections.
  // It should fail validation when these fields are missing.
  // NOTE: This test will fail until overlays are regenerated from combined.json
  const validator = getValidator(schemaId, ["ntsl2025"]);
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );

  // Set up lettings-specific fields
  clonedExampleTransaction.propertyPack.lettingInformation = {
    rent: 3500,
    rentFrequency: "Monthly",
    securityDeposit: 5000,
  };
  delete clonedExampleTransaction.propertyPack.priceInformation;
  delete clonedExampleTransaction.propertyPack.ownership;

  // Remove ALL parking fields - this should make validation fail
  delete clonedExampleTransaction.propertyPack.parking.parkingArrangements;
  delete clonedExampleTransaction.propertyPack.parking.disabledParking;
  delete clonedExampleTransaction.propertyPack.parking.controlledParking;
  delete clonedExampleTransaction.propertyPack.parking
    .electricVehicleChargingPoint;

  // Remove ALL listingAndConservation fields - this should make validation fail
  delete clonedExampleTransaction.propertyPack.listingAndConservation.isListed;
  delete clonedExampleTransaction.propertyPack.listingAndConservation
    .isConservationArea;
  delete clonedExampleTransaction.propertyPack.listingAndConservation
    .hasTreePreservationOrder;

  const isValid = validator(clonedExampleTransaction);

  // The data should be INVALID because required fields are missing
  expect(isValid).toBe(false);

  // Specifically check that parking and listingAndConservation fields are reported as missing
  const errorMessages = validator.errors.map((e) => e.message);
  expect(errorMessages).toContain(
    "must have required property 'parkingArrangements'"
  );
  expect(errorMessages).toContain(
    "must have required property 'disabledParking'"
  );
  expect(errorMessages).toContain(
    "must have required property 'controlledParking'"
  );
  expect(errorMessages).toContain(
    "must have required property 'electricVehicleChargingPoint'"
  );
  expect(errorMessages).toContain("must have required property 'isListed'");
  expect(errorMessages).toContain(
    "must have required property 'isConservationArea'"
  );
  expect(errorMessages).toContain(
    "must have required property 'hasTreePreservationOrder'"
  );
});

test("waterAndDrainage state is invalid under nts2023 overlay when mainsFoulDrainage yesNo is Not known", () => {
  const validator = getValidator(schemaId, ["nts2023"]);
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );

  // Set the waterAndDrainage to an actually invalid state for nts2023
  // The nts overlay restricts mainsFoulDrainage.yesNo to only "Yes" or "No"
  // (not "Not known" like the base schema allows)
  clonedExampleTransaction.propertyPack.waterAndDrainage = {
    water: {
      mainsWater: {
        yesNo: "Yes",
        waterMeter: {
          isSupplyMetered: "No",
        },
      },
    },
    drainage: {
      mainsSurfaceWaterDrainage: {
        yesNo: "Yes",
      },
      mainsFoulDrainage: {
        yesNo: "Not known", // This is invalid under nts2023 overlay
      },
    },
  };

  const isValid = validator(clonedExampleTransaction);
  expect(isValid).toBe(false);

  // Check that the validation error is about the invalid enum value
  const relevantError = validator.errors.find(
    (error) =>
      error.instancePath.includes("mainsFoulDrainage") &&
      error.message.includes("must be equal to one of the allowed values")
  );
  expect(relevantError).toBeDefined();
});

test("waterAndDrainage state with mainsFoulDrainage No missing offMainsDrainageSystem is now invalid under nts2023 overlay", () => {
  const validator = getValidator(schemaId, ["nts2023"]);
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );

  // Set the waterAndDrainage to the state from the user request
  // This SHOULD be invalid because offMainsDrainageSystem is required when mainsFoulDrainage.yesNo is "No"
  clonedExampleTransaction.propertyPack.waterAndDrainage = {
    water: {
      mainsWater: {
        yesNo: "Yes",
        waterMeter: {
          isSupplyMetered: "No",
        },
      },
    },
    drainage: {
      mainsSurfaceWaterDrainage: {
        yesNo: "Yes",
      },
      mainsFoulDrainage: {
        yesNo: "No",
        // Missing offMainsDrainageSystem - this should make validation fail
      },
    },
  };

  const isValid = validator(clonedExampleTransaction);
  expect(isValid).toBe(false);

  // Check that the validation error is about missing offMainsDrainageSystem
  const relevantError = validator.errors.find(
    (error) =>
      error.instancePath.includes("mainsFoulDrainage") &&
      error.message.includes("offMainsDrainageSystem")
  );
  expect(relevantError).toBeDefined();
});

test("TA7 overlay organisesBuildingInsurance enum has exactly three items", () => {
  const schema = getTransactionSchema(schemaId, ["ta7ed3"]);

  // Navigate to the organisesBuildingInsurance property in the merged schema
  const organisesBuildingInsurance =
    schema.properties?.propertyPack?.properties?.ownership?.properties
      ?.ownershipsToBeTransferred?.items?.oneOf?.[2]?.properties
      ?.leaseholdInformation?.properties?.contactDetails?.properties
      ?.serviceContactAssignments?.properties?.organisesBuildingInsurance;

  expect(organisesBuildingInsurance).toBeDefined();
  expect(organisesBuildingInsurance.enum).toBeDefined();

  // The TA7 overlay defines exactly 3 enum values, which should replace the base schema's 6 values
  expect(organisesBuildingInsurance.enum).toHaveLength(3);
  expect(organisesBuildingInsurance.enum).toEqual([
    "the Lessees",
    "Management Company",
    "Landlord",
  ]);
});
