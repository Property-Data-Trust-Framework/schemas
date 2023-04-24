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

const exampleTransaction = require("../../examples/v2/exampleTransaction.json");
const schemaId =
  "https://trust.propdata.org.uk/schemas/v2/pdtf-transaction.json";
// const validator = getValidator(schemaId);
const v2TransactionSchema = getTransactionSchema(schemaId);

test("exports a property pack schema, v2 with baspi overlay by default", () => {
  const testSchema = getTransactionSchema();
  expect(testSchema.$id).toEqual(
    "https://trust.propdata.org.uk/schemas/v2/pdtf-transaction.json"
  );
  expect(
    testSchema.properties.propertyPack.properties.materialFacts.baspiRef
  ).toEqual("A");
});

test("sample is valid", () => {
  const testSchema = getTransactionSchema();
  expect(
    testSchema.properties.propertyPack.properties.materialFacts.baspiRef
  ).toEqual("A");
  const validator = getValidator(schemaId);
  const isValid = validator(exampleTransaction);
  if (!isValid) console.log(validator.errors);
  expect(isValid).toBe(true);
});

test("invalid sample is invalid", () => {
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  delete clonedExampleTransaction.propertyPack.materialFacts.notices;
  const validator = getValidator(schemaId);
  const isValid = validator(clonedExampleTransaction);
  expect(isValid).toBe(false);
});

test("sample with missing dependent required fields is invalid", () => {
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  clonedExampleTransaction.propertyPack.materialFacts.ownership.ownershipsToBeTransferred[0].ownershipType =
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
  const isValid = isPathValid("/propertyPack/materialFacts");
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
  const isValid = isPathValid("/propertyPack/materialFacts/1/item");
  expect(isValid).toBe(false);
});

test("correctly gets a subschema", () => {
  const subschema = getSubschema(
    "/propertyPack/materialFacts/notices",
    schemaId
  );
  expect(subschema.title).toBe("Notices which Affect the Property");
});

test("correctly gets a subschema through an arrays element", () => {
  const subschema = getSubschema(
    "/propertyPack/titlesToBeSold/0/registerExtract",
    schemaId
  );
  expect(Object.keys(subschema.properties)).toEqual([
    "OCSummaryData",
    "OCRegisterData",
  ]);
});

test("correctly gets a subschema through a dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/materialFacts/delayFactors/hasDelayFactors/details",
    schemaId
  );
  expect(subschema.title).toBe(
    "Provide details and likely timescale for delay (if known)"
  );
});

test("correctly gets another subschema through a dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/materialFacts/ownership/ownershipsToBeTransferred/0/leaseholdInformation/leaseTerm/lengthOfLeaseInYears",
    schemaId
  );
  expect(subschema.title).toBe("Length of lease (years)");
});

test("correctly gets yet another subschema through a dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/materialFacts/ownership/ownershipsToBeTransferred/0/leaseholdInformation/groundRent/rentSubjectToIncrease/rentIncreaseCalculated"
  );
  expect(subschema.title).toBe("How is the increase calculated?");
});

test("correctly gets yet, yet another subschema through a dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/materialFacts/listingAndConservation/isConservationArea/yesNo"
  );
  expect(subschema.type).toBe("string");
  expect(subschema.enum).toStrictEqual(["Yes", "No"]);
});

test("correctly gets yet, yet, yet another subschema through a dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/materialFacts/environmentalIssues/flooding/typeOfFlooding/other/yesNo"
  );
  expect(subschema.type).toBe("string");
  expect(subschema.enum).toStrictEqual(["Yes", "No"]);
});

test("correctly gets yet, yet, yet another subschema through a second item dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/materialFacts/environmentalIssues/flooding/typeOfFlooding"
  );
  expect(subschema.type).toBe("object");
});

test("correctly gets yes another subschema but through a non-baspi oneOf structure", () => {
  const subschema = getSubschema(
    "/propertyPack/titlesToBeSold/0/registerExtract/OCSummaryData/RestrictionDetails/RestrictionEntry/ChargeRestriction/EntryDetails/EntryText"
  );
  expect(subschema).toEqual({ type: "string" });
});

test("correctly gets yes another subschema but through a non-baspi oneOf structure with array option", () => {
  const subschema = getSubschema(
    "/propertyPack/titlesToBeSold/0/registerExtract/OCSummaryData/RestrictionDetails/RestrictionEntry/0/ChargeRestriction/EntryDetails/EntryText"
  );
  expect(subschema).toEqual({ type: "string" });
});

test("correctly gets a subschema validator which is already cached", () => {
  const validator = getSubschemaValidator(
    "/propertyPack/materialFacts/energyEfficiency/certificate"
  );
  expect(validator).not.toBeNull();
  const anotherValidator = getSubschemaValidator(
    "/propertyPack/materialFacts/energyEfficiency/certificate"
  );
  expect(anotherValidator).not.toBeNull();
});

test("correctly gets a subschema validator which validates", () => {
  const path = "/propertyPack/materialFacts/notices";
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
      v2TransactionSchema,
      "/propertyPack/materialFacts/ownership/ownershipsToBeTransferred/0/ownershipType"
    )
  ).toBe("What type of ownership is the property?");
  expect(
    getTitleAtPath(
      v2TransactionSchema,
      "/propertyPack/materialFacts/ownership/ownershipsToBeTransferred/0/leaseholdInformation/leaseTerm/lengthOfLeaseInYears"
    )
  ).toBe("Length of lease (years)");
  expect(
    getTitleAtPath(
      v2TransactionSchema,
      "/propertyPack/materialFacts/ownership/ownershipsToBeTransferred/0/leaseholdInformation/serviceCharge/annualServiceCharge"
    )
  ).toBe("Amount of current annual service charge (£)");
  expect(
    getTitleAtPath(
      v2TransactionSchema,
      "/propertyPack/materialFacts/invalidPath"
    )
  ).toBe(undefined);
  expect(
    getTitleAtPath(
      v2TransactionSchema,
      "/propertyPack/titlesToBeSold/0/registerExtract"
    )
  ).toBe("HMLR Official Copy Register Extract");
  expect(
    getTitleAtPath(
      v2TransactionSchema,
      "/propertyPack/titlesToBeSold/0/registerExtract/OCSummaryData/PropertyAddress"
    )
  ).toBe("Property address");
  expect(
    getTitleAtPath(
      v2TransactionSchema,
      "/propertyPack/titlesToBeSold/0/registerExtract/OCSummaryData/InvalidProp"
    )
  ).toBe(undefined);
  expect(
    getTitleAtPath(
      v2TransactionSchema,
      "/propertyPack/materialFacts/energyEfficiency/certificate/currentEnergyRating"
    )
  ).toBe("Current energy efficiency rating");
  expect(
    getTitleAtPath(
      v2TransactionSchema,
      "/propertyPack/additionalLegalInfo/occupiers/othersAged17OrOver/aged17OrOverNames"
    )
  ).toBe("Please provide their full names and ages.");
});
