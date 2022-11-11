const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const verifiedClaimsSchema = require("../schemas/v1/pdtf-verified-claims.json");
const exampleElectronicRecord = require("../examples/exampleElectronicRecord.json");
const exampleVouch = require("../examples/exampleVouch.json");
const exampleDocumentedVouch = require("../examples/exampleDocumentedVouch.json");

const ajv = new Ajv({
  allErrors: true,
  strictSchema: false,
  discriminator: true,
});
addFormats(ajv);

const validator = ajv.compile(verifiedClaimsSchema);

test("valid vouch sample is valid", () => {
  const isValid = validator({ verified_claims: [exampleVouch] });
  expect(isValid).toBe(true);
});

test("valid electronic record sample is valid", () => {
  const isValid = validator({ verified_claims: [exampleElectronicRecord] });
  expect(isValid).toBe(true);
});

test("valid documented vouch sample is valid", () => {
  const isValid = validator({ verified_claims: [exampleDocumentedVouch] });
  expect(isValid).toBe(true);
});

test("sample with primitive claims value is valid", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.claims = { "/propertyPack/uprn": 123456 };
  const isValid = validator({ verified_claims: [clonedVouch] });
  expect(isValid).toBe(true);
});

test("sample with undefined claims value is also valid, but this would fail when the payload is validated", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.claims = { "/propertyPack/uprn": undefined };
  const isValid = validator({ verified_claims: [clonedVouch] });
  expect(isValid).toBe(true);
});

test("claim with missing claims is invalid", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  delete clonedVouch.claims;
  const isValid = validator({ verified_claims: [clonedVouch] });
  expect(isValid).toBe(false);
});

test("claim with invalid claims path is invalid", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  const originalPath = Object.keys(clonedVouch.claims)[0];
  const data = clonedVouch.claims[originalPath];
  clonedVouch.claims = { "invalidPath//of?someKind": data };
  const isValid = validator({ verified_claims: [clonedVouch] });
  expect(isValid).toBe(false);
});

test("verification with invalid evidence type is invalid", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  clonedVouch.verification.evidence[0].type = "something invalid";
  const isValid = validator({ verified_claims: [clonedVouch] });
  expect(isValid).toBe(false);
});

test("verification with no framework type is invalid", () => {
  const clonedVouch = JSON.parse(JSON.stringify(exampleVouch));
  delete clonedVouch.verification.trust_framework;
  const isValid = validator({ verified_claims: [clonedVouch] });
  expect(isValid).toBe(false);
});
