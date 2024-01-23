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
  expect(testSchema.properties.propertyPack.properties.baspiRef).toEqual(
    undefined
  );
});

test("sample is valid BASPI", () => {
  const testSchema = getTransactionSchema(schemaId, ["baspiV4"]);
  expect(testSchema.properties.propertyPack.baspiRef).toEqual("0");
  const validator = getValidator(schemaId);
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
    ["baspiV4", "ta6ed4"]
  );
  expect(subschema.baspiRef).toBe("A1.6.0");
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
