const jp = require("jsonpointer");

const {
  ajv,
  getTransactionSchema,
  getValidator,
  getSubschema,
  isPathValid,
  getSubschemaValidator,
  getTitleAtPath,
} = require("../../../index.js");
const exampleTransaction = require("../../examples/v2/exampleTransaction.json");
const schemaId =
  "https://trust.propdata.org.uk/schemas/v2/pdtf-transaction.json";
const validator = getValidator(schemaId);
const transactionSchema = getTransactionSchema(schemaId);

test("exports a property pack schema, v1 by default", () => {
  expect(getTransactionSchema().$id).toEqual(
    "https://trust.propdata.org.uk/schemas/v1/pdtf-transaction.json"
  );
});

test("exports a property pack schema, v2 when specified default", () => {
  expect(getTransactionSchema(schemaId).$id).toEqual(
    "https://trust.propdata.org.uk/schemas/v2/pdtf-transaction.json"
  );
});

test("can compile a schema", () => {
  const schema = getTransactionSchema(schemaId);
  const testSchema = schema;
  const validator = ajv.compile(testSchema);
  expect(validator).toBeDefined();
});

test("can create a validator", () => {
  const validator = getValidator(schemaId);
  expect(validator).toBeDefined();
});

test("sample is valid", () => {
  const isValid = validator(exampleTransaction);
  if (!isValid) console.log(validator.errors);
  expect(isValid).toBe(true);
});

test("invalid sample is invalid", () => {
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  delete clonedExampleTransaction.propertyPack.materialFacts.notices;
  const isValid = validator(clonedExampleTransaction);
  expect(isValid).toBe(false);
});

test("sample with missing dependent required fields is invalid", () => {
  const clonedExampleTransaction = JSON.parse(
    JSON.stringify(exampleTransaction)
  );
  clonedExampleTransaction.propertyPack.materialFacts.ownership.ownershipsToBeTransferred[0].ownershipType =
    "leasehold";
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
  const isValid = isPathValid("/propertyPack/materialItems/someProperty/item");
  expect(isValid).toBe(false);
});

test("correctly identifies an array invalid path", () => {
  const isValid = isPathValid("/propertyPack/materialFacts/1/item");
  expect(isValid).toBe(false);
});

test("correctly gets a subschema", () => {
  const subschema = getSubschema("/propertyPack/materialFacts/notices");
  expect(subschema.title).toBe("Notices which Affect the Property");
});

test("correctly gets a subschema through an arrays element", () => {
  const subschema = getSubschema(
    "/propertyPack/titlesToBeSold/0/registerExtract"
  );
  expect(subschema.title).toBe("HMLR Official Copy Register Extract");
});

test("correctly gets another subschema through an arrays element", () => {
  const subschema = getSubschema("/participants/0/name/firstName");
  expect(subschema.title).toBe("First name");
});

test("correctly gets a subschema through a dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/materialFacts/delayFactors/hasDelayFactors/details"
  );
  expect(subschema.title).toBe("Details");
});

test("correctly gets another subschema through a dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/materialFacts/ownership/ownershipsToBeTransferred/0/lengthOfLeaseInYears"
  );
  expect(subschema.title).toBe("Length of lease (years)");
});

test("correctly gets yet another subschema through a dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/materialFacts/ownership/ownershipsToBeTransferred/0/rentIncrease/details"
  );
  expect(subschema.title).toBe("Details");
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
    "/propertyPack/materialFacts/otherIssues/flooding/typeOfFlooding/groundWater/yesNo"
  );
  expect(subschema.type).toBe("string");
  expect(subschema.enum).toStrictEqual(["Yes", "No"]);
});

test("correctly gets yet, yet, yet another subschema through a second item dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/materialFacts/otherIssues/flooding/typeOfFlooding"
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
    "/propertyPack/energyPerformanceCertificate"
  );
  expect(validator).not.toBeNull();
  const anotherValidator = getSubschemaValidator(
    "/propertyPack/energyPerformanceCertificate"
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
      transactionSchema,
      "/propertyPack/materialFacts/ownership/ownershipsToBeTransferred/0/ownershipType"
    )
  ).toBe("What type of ownership is the property?");
  expect(
    getTitleAtPath(
      transactionSchema,
      "/propertyPack/materialFacts/ownership/ownershipsToBeTransferred/0/leaseholdInformation/general/leaseTerm/lengthOfLeaseInYears"
    )
  ).toBe("Length of lease (years)");
  expect(
    getTitleAtPath(
      transactionSchema,
      "/propertyPack/materialFacts/ownership/ownershipsToBeTransferred/0/leaseholdInformation/serviceCharge/annualServiceCharge"
    )
  ).toBe("Amount of current annual service charge (£)");
  expect(
    getTitleAtPath(transactionSchema, "/propertyPack/materialFacts/invalidPath")
  ).toBe(undefined);
  expect(
    getTitleAtPath(
      transactionSchema,
      "/propertyPack/titlesToBeSold/0/registerExtract"
    )
  ).toBe("HMLR Official Copy Register Extract");
  expect(
    getTitleAtPath(
      transactionSchema,
      "/propertyPack/titlesToBeSold/0/registerExtract/OCSummaryData/PropertyAddress"
    )
  ).toBe("Property address");
  expect(
    getTitleAtPath(
      transactionSchema,
      "/propertyPack/titlesToBeSold/0/registerExtract/OCSummaryData/InvalidProp"
    )
  ).toBe(undefined);
  expect(
    getTitleAtPath(
      transactionSchema,
      "/propertyPack/materialFacts/energyEfficiency/certificate/currentEnergyRating"
    )
  ).toBe("Current energy efficiency rating");
  expect(
    getTitleAtPath(
      transactionSchema,
      "/propertyPack/additionalLegalInfo/occupiers/othersAged17OrOver/aged17OrOverNames"
    )
  ).toBe("Please provide their full names and ages.");
});
