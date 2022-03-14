const jp = require("jsonpointer");

const {
  propertyPackSchema,
  validator,
  getSubschema,
  getSubschemaValidator,
  getTitleAtPath,
} = require("../../index.js");
const examplePropertyPack = require("../examples/examplePropertyPack.json");

test("exports a property pack schema", () => {
  expect(propertyPackSchema).not.toBeNull();
});

test("sample is valid", () => {
  const isValid = validator(examplePropertyPack);
  expect(isValid).toBe(true);
});

test("invalid sample is invalid", () => {
  const clonedExamplePropertyPack = JSON.parse(
    JSON.stringify(examplePropertyPack)
  );
  delete clonedExamplePropertyPack.propertyPack.materialFacts.notices;
  const isValid = validator(clonedExamplePropertyPack);
  expect(isValid).toBe(false);
});

test("sample with missing dependent required fields is invalid", () => {
  const clonedExamplePropertyPack = JSON.parse(
    JSON.stringify(examplePropertyPack)
  );
  clonedExamplePropertyPack.propertyPack.materialFacts.ownership.ownershipType =
    "leashold";
  const isValid = validator(clonedExamplePropertyPack);
  expect(isValid).toBe(false);
});

test("correctly gets a top level subschema", () => {
  const subschema = getSubschema("/propertyPack");
  expect(subschema.title).toBe("Property Pack");
});

test("correctly gets a subschema", () => {
  const subschema = getSubschema("/propertyPack/materialFacts/notices");
  expect(subschema.title).toBe("Notices which Affect the Property");
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

test("correctly gets a working subschema validator", () => {
  const path = "/propertyPack/materialFacts/notices";
  const validator = getSubschemaValidator(path);
  const data = jp.get(examplePropertyPack, path);
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
      propertyPackSchema,
      "/propertyPack/materialFacts/ownership/ownershipType"
    )
  ).toBe("What type of ownership is the property?");
  expect(
    getTitleAtPath(
      propertyPackSchema,
      "/propertyPack/materialFacts/ownership/leaseholdDetails/lengthOfLeaseInYears"
    )
  ).toBe("Length of lease (years)");
  expect(
    getTitleAtPath(
      propertyPackSchema,
      "/propertyPack/materialFacts/ownership/managedFreeholdOrCommonhold/annualServiceCharge"
    )
  ).toBe(
    "Amount of current annual service charge/estate rentcharge/maintenance contribution (£)"
  );
  expect(
    getTitleAtPath(
      propertyPackSchema,
      "/propertyPack/materialFacts/invalidPath"
    )
  ).toBe(undefined);
  expect(
    getTitleAtPath(
      propertyPackSchema,
      "/propertyPack/titlesToBeSold/0/registerExtract"
    )
  ).toBe("Property Data Trust Framework HMLR Register Extract representation");
  expect(
    getTitleAtPath(
      propertyPackSchema,
      "/propertyPack/titlesToBeSold/0/registerExtract/OCSummaryData/PropertyAddress"
    )
  ).toBe("Property address");
  expect(
    getTitleAtPath(
      propertyPackSchema,
      "/propertyPack/titlesToBeSold/0/registerExtract/OCSummaryData/InvalidProp"
    )
  ).toBe(undefined);
  expect(
    getTitleAtPath(
      propertyPackSchema,
      "/propertyPack/energyPerformanceCertificate/certificate/currentEnergyRating"
    )
  ).toBe("Current energy rating");
});
