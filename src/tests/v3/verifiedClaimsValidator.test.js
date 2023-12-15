const { validateVerifiedClaims } = require("../../../index.js");

const exampleVouch = require("../../examples/v1/exampleVouch.json");
const exampleDocumentedVouch = require("../../examples/v1/exampleDocumentedVouch.json");
const v3SchemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

test("returns an empty array for a valid claim", () => {
  expect(validateVerifiedClaims([exampleVouch])).toEqual([]);
});

test("returns an empty array for a valid array of claims", () => {
  const claimsArray = [exampleVouch, exampleDocumentedVouch];
  expect(validateVerifiedClaims(claimsArray)).toEqual([]);
});

test("returns an array with an error stating if path is incorrect", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  const originalPath = Object.keys(clonedVouch.claims)[0];
  const data = clonedVouch.claims[originalPath];
  clonedVouch.claims = {
    "/propertyPack/INVALID/materialFacts/councilTax": data,
  };
  // v3 schema, no overlay
  expect(validateVerifiedClaims([clonedVouch], v3SchemaId, null)).toEqual([
    "Path /propertyPack/INVALID/materialFacts/councilTax is not a valid PDTF schema path",
  ]);
});

test("returns errors if BASPI requirements are not met and BASPI overlay is specified", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.claims = {
    "/propertyPack/materialFacts/delayFactors": {
      hasDelayFactors: { yesNo: "Yes" },
    },
  };
  const errors = validateVerifiedClaims([clonedVouch], v3SchemaId, ["baspiV4"]);
  expect(errors).toEqual([
    {
      instancePath: "/hasDelayFactors",
      schemaPath: "#/properties/hasDelayFactors/oneOf/1/required",
      keyword: "required",
      params: { missingProperty: "details" },
      message: "must have required property 'details'",
    },
    {
      instancePath: "/hasDelayFactors",
      schemaPath: "#/properties/hasDelayFactors/oneOf/1/required",
      keyword: "required",
      params: { missingProperty: "attachments" },
      message: "must have required property 'attachments'",
    },
  ]);
});

test("returns no errors if BASPI requirements are not met and null overlay is specified", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.claims = {
    "/propertyPack/materialFacts/delayFactors": {
      hasDelayFactors: { yesNo: "Yes" },
    },
  };
  const errors = validateVerifiedClaims([clonedVouch], v3SchemaId, null);
  expect(errors).toEqual([]);
});

test("returns errors for invalid fields even if null overlay is specified", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.claims = {
    "/propertyPack/materialFacts/delayFactors": {
      hasDelayFactors: { yesNo: "Maybe" },
    },
  };
  const errors = validateVerifiedClaims([clonedVouch], v3SchemaId, null);
  expect(errors).toHaveLength(4);
});

test("returns an array of errors for verified claim with multiple paths", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.claims = {
    "/propertyPack/materialFacts/cousncilTaxBad": {
      councilTaxBand: "D",
      councilTaxAffectingAlterations: {
        yesNo: "Yes",
        details:
          "Extension added in 2005 to add bedroom with ensuite shower room. Certificate of Compliance issued 17th Feb 2006 and council tax updated",
      },
    },
    "/propertyPack/materialFacts/councilTaxBadTwo": {
      councilTaxBand: "D",
      councilTaxAffectingAlterations: {
        yesNo: "Yes",
        details:
          "Extension added in 2005 to add bedroom with ensuite shower room. Certificate of Compliance issued 17th Feb 2006 and council tax updated",
      },
    },
  };
  expect(validateVerifiedClaims([clonedVouch], v3SchemaId, null)).toEqual([
    "Path /propertyPack/materialFacts/cousncilTaxBad is not a valid PDTF schema path",
    "Path /propertyPack/materialFacts/councilTaxBadTwo is not a valid PDTF schema path",
  ]);
});

test("returns an empty array of errors for verified claim with multiple valid paths", () => {
  const clonedVouch = JSON.parse(
    JSON.stringify(exampleVouch),
    v3SchemaId,
    null
  );
  clonedVouch.claims = {
    "/propertyPack/materialFacts/councilTax": {
      councilTaxBand: "D",
      councilTaxAffectingAlterations: {
        yesNo: "Yes",
        details:
          "Extension added in 2005 to add bedroom with ensuite shower room. Certificate of Compliance issued 17th Feb 2006 and council tax updated",
      },
    },
    "/propertyPack/materialFacts/address": {
      line1: "property.line1",
      line2: "property.line2",
      town: "property.city",
      county: "property.province",
      postcode: "property.postcode",
    },
  };
  expect(validateVerifiedClaims([clonedVouch], v3SchemaId, null)).toEqual([]);
});
