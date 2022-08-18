const { validateVerifiedClaims } = require("../../index.js");

const exampleVouch = require("../examples/exampleVouch.json");
const exampleDocumentedVouch = require("../examples/exampleDocumentedVouch.json");

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
  expect(validateVerifiedClaims([clonedVouch])).toEqual([
    "Path /propertyPack/INVALID/materialFacts/councilTax is not a valid PDTF schema path",
  ]);
});

test("returns an array of errors if data in the path is in invalid format", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.claims = {
    "/propertyPack/materialFacts/councilTax": {
      councilTaxBand: "D",
      councilTaxAffectingAlterationsINVALID: {
        yesNo: "Yes",
        details:
          "Extension added in 2005 to add bedroom with ensuite shower room. Certificate of Compliance issued 17th Feb 2006 and council tax updated",
      },
    },
  };
  expect(validateVerifiedClaims([clonedVouch])).toEqual([
    {
      instancePath: "",
      schemaPath: "#/required",
      keyword: "required",
      params: { missingProperty: "councilTaxAffectingAlterations" },
      message: "must have required property 'councilTaxAffectingAlterations'",
    },
  ]);
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
  expect(validateVerifiedClaims([clonedVouch])).toEqual([
    "Path /propertyPack/materialFacts/cousncilTaxBad is not a valid PDTF schema path",
    "Path /propertyPack/materialFacts/councilTaxBadTwo is not a valid PDTF schema path",
  ]);
});

test("returns an empty array of errors for verified claim with multiple valid paths", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
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
  expect(validateVerifiedClaims([clonedVouch])).toEqual([]);
});
