const jp = require("jsonpointer");
const fs = require("fs");

const {
  getTransactionSchema,
  getSubschema,
  isPathValid,
  getValidator,
  getSubschemaValidator,
  getTitleAtPath,
  overlaysMap,
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
  if (!isValid) console.log(validator.errors);
  expect(isValid).toBe(true);
});

test("sample is valid NTS", () => {
  const validator = getValidator(schemaId, ["nts2023"]);
  const isValid = validator(exampleTransaction);
  if (!isValid) console.log(validator.errors);
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
  if (!isValid) console.log(validator.errors);
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
  const validator = getSubschemaValidator(path, exampleTransaction.$schema, [
    "ta6ed4",
  ]);
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

test("overlay as key and as object produce identical results", () => {
  // Get the NTS overlay object directly from the overlays map
  const ntsOverlayObject = { ...overlaysMap[schemaId]["nts2023"] };
  // Remove the $id to prevent schema registration conflicts
  ntsOverlayObject.$id =
    "https://trust.propdata.org.uk/schemas/v3/overlays/nts2024.json";

  // Get schema using the key
  const schemaWithKey = getTransactionSchema(schemaId, ["nts2023"]);

  // Get schema using the object
  const schemaWithObject = getTransactionSchema(schemaId, [ntsOverlayObject]);

  // Create copies without $id for comparison
  const schemaWithKeyNoId = { ...schemaWithKey };
  const schemaWithObjectNoId = { ...schemaWithObject };
  delete schemaWithKeyNoId.$id;
  delete schemaWithObjectNoId.$id;

  // Deep compare the results (excluding $id)
  expect(schemaWithObjectNoId).toEqual(schemaWithKeyNoId);

  // Test that validation produces the same errors
  const validatorWithKey = getValidator(schemaId, ["nts2023"]);
  const validatorWithObject = getValidator(schemaId, [ntsOverlayObject]);

  validatorWithKey(exampleTransaction);
  validatorWithObject(exampleTransaction);

  // Compare validation errors
  expect(validatorWithObject.errors).toEqual(validatorWithKey.errors);
});

test("correctly merges custom Japanese Knotweed overlay with base schema", () => {
  // Load the custom overlay
  const customOverlay = require("../../examples/v3/exampleCustomOverlay.json");

  // Get base schema and schema with overlay
  const baseSchema = getTransactionSchema(schemaId);
  const schemaWithOverlay = getTransactionSchema(schemaId, [customOverlay]);

  // Verify that other properties in propertyPack are preserved
  expect(
    Object.keys(schemaWithOverlay.properties.propertyPack.properties)
  ).toEqual(Object.keys(baseSchema.properties.propertyPack.properties));

  // Verify that other properties in specialistIssues are preserved
  const baseSpecialistIssues =
    baseSchema.properties.propertyPack.properties.specialistIssues;
  const overlaidSpecialistIssues =
    schemaWithOverlay.properties.propertyPack.properties.specialistIssues;
  expect(Object.keys(overlaidSpecialistIssues.properties)).toEqual(
    Object.keys(baseSpecialistIssues.properties)
  );

  // Verify that Japanese Knotweed section is updated
  const japaneseKnotweed = overlaidSpecialistIssues.properties.japaneseKnotweed;
  expect(japaneseKnotweed.title).toBe(
    "Is the property affected by Japanese knotweed?"
  );
  expect(japaneseKnotweed.required).toEqual(["yesNo"]);

  // Verify the oneOf conditions are updated
  expect(japaneseKnotweed.oneOf).toHaveLength(2);
  expect(japaneseKnotweed.oneOf[0].properties.yesNo.enum).toEqual([
    "No",
    "Not known",
  ]);
  expect(japaneseKnotweed.oneOf[1].properties.yesNo.enum).toEqual(["Yes"]);
  expect(japaneseKnotweed.oneOf[1].required).toEqual([
    "managementPlanInPlace",
    "attachments",
  ]);
});

test("correctly merges multiple overlays using both key and object references", () => {
  // Load the custom overlay
  const customOverlay = require("../../examples/v3/exampleCustomOverlay.json");

  // Get schema with both overlays
  const schemaWithOverlays = getTransactionSchema(schemaId, [
    "nts2023",
    customOverlay,
  ]);

  // Get individual overlay schemas for comparison
  const ntsSchema = getTransactionSchema(schemaId, ["nts2023"]);
  const customSchema = getTransactionSchema(schemaId, [customOverlay]);

  // Verify propertyPack structure is preserved
  const propertyPack = schemaWithOverlays.properties.propertyPack;
  expect(Object.keys(propertyPack.properties)).toEqual(
    expect.arrayContaining(
      Object.keys(ntsSchema.properties.propertyPack.properties)
    )
  );

  // Verify Japanese Knotweed changes from custom overlay are present
  const japaneseKnotweed =
    propertyPack.properties.specialistIssues.properties.japaneseKnotweed;
  expect(japaneseKnotweed.title).toBe(
    "Is the property affected by Japanese knotweed?"
  );
  expect(japaneseKnotweed.oneOf[1].required).toEqual([
    "managementPlanInPlace",
    "attachments",
  ]);

  // Verify customRef properties are correctly merged
  expect(propertyPack.customRef).toBe("JKW");
  expect(propertyPack.properties.specialistIssues.customRef).toBe("JKW.7");
  expect(japaneseKnotweed.customRef).toBe("JKW.7.8");
  expect(
    japaneseKnotweed.oneOf[1].properties.managementPlanInPlace.customRef
  ).toBe("JKW.7.8.2");
  expect(japaneseKnotweed.oneOf[1].properties.attachments.customRef).toBe(
    "JKW.7.8.3"
  );
  expect(japaneseKnotweed.properties.yesNo.customRef).toBe("JKW.7.8.1");

  // Verify NTS specific changes are present (e.g., simplified enums)
  const mainsElectricity =
    propertyPack.properties.electricity.properties.mainsElectricity;
  expect(mainsElectricity.properties.yesNo.enum).toEqual(["Yes", "No"]);

  // Verify required fields from both overlays are merged
  expect(propertyPack.required).toEqual(
    expect.arrayContaining([
      ...ntsSchema.properties.propertyPack.required,
      ...customSchema.properties.propertyPack.required,
    ])
  );
});

test("correctly merges NTS and both custom overlays with proper required fields", () => {
  // Load both custom overlays
  const japaneseKnoweedOverlay = require("../../examples/v3/exampleCustomOverlay.json");
  const managingAgentOverlay = require("../../examples/v3/exampleCustomOverlay2.json");

  // Get schema with all overlays
  const schemaWithOverlays = getTransactionSchema(schemaId, [
    "nts2023",
    japaneseKnoweedOverlay,
    managingAgentOverlay,
  ]);

  // Navigate to the leasehold section in the oneOf array
  const leaseholdSchema =
    schemaWithOverlays.properties.propertyPack.properties.ownership.properties.ownershipsToBeTransferred.items.oneOf.find(
      (schema) => schema.properties.ownershipType.enum[0] === "Leasehold"
    );

  // Verify the leasehold information structure
  const leaseholdInfo = leaseholdSchema.properties.leaseholdInformation;

  // Check required fields - should include both NTS and custom overlay requirements
  expect(leaseholdInfo.required).toContain("contactDetails");
  expect(leaseholdInfo.required).toContain("leaseTerm"); // from NTS
  expect(leaseholdInfo.required).toContain("groundRent"); // from NTS

  // Verify managing agent contact structure and refs
  const managingAgent =
    leaseholdInfo.properties.contactDetails.properties.contacts.properties
      .managingAgent;
  expect(managingAgent.macRef).toBe("MAC.4.1c");

  // Verify contact details structure
  const contact = managingAgent.properties.contact;
  expect(contact.properties.nameOrOrganisation.macRef).toBe("MAC.4.1c.1");
  expect(contact.properties.address.macRef).toBe("MAC.4.1c.0");
  expect(contact.properties.telephone.macRef).toBe("MAC.4.1c.7");
  expect(contact.properties.emailAddress.macRef).toBe("MAC.4.1c.8");

  // Verify Japanese Knotweed section is still present and correct
  const japaneseKnotweed =
    schemaWithOverlays.properties.propertyPack.properties.specialistIssues
      .properties.japaneseKnotweed;
  expect(japaneseKnotweed.customRef).toBe("JKW.7.8");

  // Verify NTS changes are still present
  const mainsElectricity =
    schemaWithOverlays.properties.propertyPack.properties.electricity.properties
      .mainsElectricity;
  expect(mainsElectricity.properties.yesNo.enum).toEqual(["Yes", "No"]);
});

test("ta7 overlay as key and as object produce identical results at leasehold info level", () => {
  // Get the TA7 overlay object directly from the overlays map
  const ta7OverlayObject = { ...overlaysMap[schemaId]["ta7ed3"] };
  // Remove the $id to prevent schema registration conflicts
  ta7OverlayObject.$id =
    "https://trust.propdata.org.uk/schemas/v3/overlays/ta7ed3-copy.json";

  // Get schemas using both methods
  const schemaWithKey = getTransactionSchema(schemaId, ["ta7ed3"]);
  const schemaWithObject = getTransactionSchema(schemaId, [ta7OverlayObject]);

  // Navigate to the leasehold information section in both schemas
  const getLeaseholdInfo = (schema) => {
    const ownershipsToBeTransferred =
      schema.properties.propertyPack.properties.ownership.properties
        .ownershipsToBeTransferred;
    const leaseholdSchema = ownershipsToBeTransferred.items.oneOf.find(
      (schema) => schema.properties.ownershipType.enum[0] === "Leasehold"
    );
    return leaseholdSchema.properties.leaseholdInformation;
  };

  const leaseholdInfoWithKey = getLeaseholdInfo(schemaWithKey);
  const leaseholdInfoWithObject = getLeaseholdInfo(schemaWithObject);

  // Deep compare the leasehold information sections
  expect(leaseholdInfoWithObject).toEqual(leaseholdInfoWithKey);

  // Verify specific TA7 requirements are present in both
  expect(leaseholdInfoWithKey.required).toContain("contactDetails");
  expect(leaseholdInfoWithObject.required).toContain("contactDetails");

  // Verify TA7 refs are present and identical
  const contactDetails = leaseholdInfoWithKey.properties.contactDetails;
  expect(contactDetails.ta7Ref).toBe("4.1");
  expect(leaseholdInfoWithObject.properties.contactDetails.ta7Ref).toBe("4.1");
});
