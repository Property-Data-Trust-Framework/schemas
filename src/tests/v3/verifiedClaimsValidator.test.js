const { validateVerifiedClaims } = require("../../../index.js");

const exampleVouch = require("../../examples/v3/exampleVouch.json");
const exampleDocumentedVouch = require("../../examples/v3/exampleDocumentedVouch.json");
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
    "/propertyPack/INVALID/councilTax": data,
  };
  // v3 schema, no overlay
  expect(validateVerifiedClaims([clonedVouch], v3SchemaId, null)).toEqual([
    "Path /propertyPack/INVALID/councilTax is not a valid PDTF schema path",
  ]);
});

test("returns errors if BASPI requirements are not met and BASPI overlay is specified", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.claims = {
    "/propertyPack/delayFactors": {
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
    "/propertyPack/delayFactors": {
      hasDelayFactors: { yesNo: "Yes" },
    },
  };
  const errors = validateVerifiedClaims([clonedVouch], v3SchemaId, null);
  expect(errors).toEqual([]);
});

test("returns errors for invalid fields even if null overlay is specified", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.claims = {
    "/propertyPack/delayFactors": {
      hasDelayFactors: { yesNo: "Maybe" },
    },
  };
  const errors = validateVerifiedClaims([clonedVouch], v3SchemaId, null);
  expect(errors).toHaveLength(4);
});

test("returns an array of errors for verified claim with multiple paths", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.claims = {
    "/propertyPack/cousncilTaxBad": {
      councilTaxBand: "D",
      councilTaxAffectingAlterations: {
        yesNo: "Yes",
        details:
          "Extension added in 2005 to add bedroom with ensuite shower room. Certificate of Compliance issued 17th Feb 2006 and council tax updated",
      },
    },
    "/propertyPack/councilTaxBadTwo": {
      councilTaxBand: "D",
      councilTaxAffectingAlterations: {
        yesNo: "Yes",
        details:
          "Extension added in 2005 to add bedroom with ensuite shower room. Certificate of Compliance issued 17th Feb 2006 and council tax updated",
      },
    },
  };
  expect(validateVerifiedClaims([clonedVouch], v3SchemaId, null)).toEqual([
    "Path /propertyPack/cousncilTaxBad is not a valid PDTF schema path",
    "Path /propertyPack/councilTaxBadTwo is not a valid PDTF schema path",
  ]);
});

test("returns an empty array of errors for verified claim with multiple valid paths", () => {
  const clonedVouch = JSON.parse(
    JSON.stringify(exampleVouch),
    v3SchemaId,
    null
  );
  clonedVouch.claims = {
    "/propertyPack/councilTax": {
      councilTaxBand: "D",
      councilTaxAffectingAlterations: {
        yesNo: "Yes",
        details:
          "Extension added in 2005 to add bedroom with ensuite shower room. Certificate of Compliance issued 17th Feb 2006 and council tax updated",
      },
    },
    "/propertyPack/address": {
      line1: "property.line1",
      line2: "property.line2",
      town: "property.city",
      county: "property.province",
      postcode: "property.postcode",
    },
  };
  expect(validateVerifiedClaims([clonedVouch], v3SchemaId, null)).toEqual([]);
});

test("returns an empty array for valid terms_of_use object with confidential level", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.terms_of_use = {
    confidentiality_level: "confidential",
    allowed_roles: ["Seller's Conveyancer", "Buyer's Conveyancer"]
  };
  expect(validateVerifiedClaims([clonedVouch])).toEqual([]);
});

test("returns an empty array for valid terms_of_use with public confidentiality", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.terms_of_use = {
    confidentiality_level: "public",
    allowed_roles: []
  };
  expect(validateVerifiedClaims([clonedVouch])).toEqual([]);
});

test("returns an empty array for valid terms_of_use with restricted level", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.terms_of_use = {
    confidentiality_level: "restricted",
    allowed_roles: []
  };
  expect(validateVerifiedClaims([clonedVouch])).toEqual([]);
});

test("returns errors for invalid confidentiality_level in terms_of_use", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.terms_of_use = {
    confidentiality_level: "invalid_level",
    allowed_roles: ["Seller's Conveyancer"]
  };
  const errors = validateVerifiedClaims([clonedVouch]);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toHaveLength(1);
  expect(errors[0][0].instancePath).toBe("/verified_claims/0/terms_of_use/confidentiality_level");
  expect(errors[0][0].keyword).toBe("enum");
});

test("returns errors for invalid allowed_roles type in terms_of_use", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.terms_of_use = {
    confidentiality_level: "confidential",
    allowed_roles: "not_an_array"
  };
  const errors = validateVerifiedClaims([clonedVouch]);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toHaveLength(1);
  expect(errors[0][0].instancePath).toBe("/verified_claims/0/terms_of_use/allowed_roles");
  expect(errors[0][0].keyword).toBe("type");
});

test("returns errors for additional properties in terms_of_use", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.terms_of_use = {
    confidentiality_level: "confidential",
    allowed_roles: ["Estate Agent"],
    extra_property: "should_not_be_allowed"
  };
  const errors = validateVerifiedClaims([clonedVouch]);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toHaveLength(1);
  expect(errors[0][0].instancePath).toBe("/verified_claims/0/terms_of_use");
  expect(errors[0][0].keyword).toBe("additionalProperties");
});
