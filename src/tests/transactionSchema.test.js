const jp = require("jsonpointer");

const {
  transactionSchema,
  validator,
  getSubschema,
  isPathValid,
  getSubschemaValidator,
  getTitleAtPath,
  validateVerifiedClaims
} = require("../../index.js");
const exampleTransaction = require("../examples/exampleTransaction.json");

test("exports a property pack schema", () => {
  expect(transactionSchema).not.toBeNull();
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
  clonedExampleTransaction.propertyPack.materialFacts.ownership.ownershipType =
    "leashold";
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
    "/propertyPack/materialFacts/ownership/leaseholdDetails/lengthOfLeaseInYears"
  );
  expect(subschema.title).toBe("Length of lease (years)");
});

test("correctly gets yet another subschema through a dependency", () => {
  const subschema = getSubschema(
    "/propertyPack/materialFacts/ownership/leaseholdDetails/rentIncrease/details"
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
      "/propertyPack/materialFacts/ownership/ownershipType"
    )
  ).toBe("What type of ownership is the property?");
  expect(
    getTitleAtPath(
      transactionSchema,
      "/propertyPack/materialFacts/ownership/leaseholdDetails/lengthOfLeaseInYears"
    )
  ).toBe("Length of lease (years)");
  expect(
    getTitleAtPath(
      transactionSchema,
      "/propertyPack/materialFacts/ownership/managedFreeholdOrCommonhold/annualServiceCharge"
    )
  ).toBe(
    "Amount of current annual service charge/estate rentcharge/maintenance contribution (£)"
  );
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
      "/propertyPack/energyPerformanceCertificate/certificate/currentEnergyRating"
    )
  ).toBe("Current energy rating");
});

test("returns an array with an error stating if path is incorrect", () => {
  const vClaims = [
    {
      verification: {
        trust_framework: "uk_pdtf",
        time: "2022-01-25T13:16:44.527Z",
        evidence: [
          {
            verification_method: {
              type: "auth",
            },
            type: "vouch",
            attestation: {
              voucher: {
                name: "Maria Harris",
              },
              type: "digital_attestation",
            },
          },
          {
            type: "document",
            attachments: [
              {
                digest: {
                  alg: "md5",
                  value: "randomHashValue",
                },
                url: "https://fakeFileStore.com/some/kind/of/file",
                desc: "proofOfAddress.pdf",
              },
            ],
          },
        ],
      },
      claims: {
        "/propertyPack/INVALID/materialFacts/councilTax": {
          councilTaxBand: "D",
          councilTaxAffectingAlterations: {
            yesNo: "Yes",
            details:
              "Extension added in 2005 to add bedroom with ensuite shower room. Certificate of Compliance issued 17th Feb 2006 and council tax updated",
          },
        },
      },
    },
  ];
  expect(validateVerifiedClaims(vClaims)).toEqual([
    "Path /propertyPack/INVALID/materialFacts/councilTax is not a valid PDTF schema path",
  ]);
});

test("returns an empty array if path is correct", () => {
  const vClaims = [
    {
      verification: {
        trust_framework: "uk_pdtf",
        time: "2022-01-25T13:16:44.527Z",
        evidence: [
          {
            verification_method: {
              type: "auth",
            },
            type: "vouch",
            attestation: {
              voucher: {
                name: "Maria Harris",
              },
              type: "digital_attestation",
            },
          },
          {
            type: "document",
            attachments: [
              {
                digest: {
                  alg: "md5",
                  value: "randomHashValue",
                },
                url: "https://fakeFileStore.com/some/kind/of/file",
                desc: "proofOfAddress.pdf",
              },
            ],
          },
        ],
      },
      claims: {
        "/propertyPack/materialFacts/councilTax": {
          councilTaxBand: "D",
          councilTaxAffectingAlterations: {
            yesNo: "Yes",
            details:
              "Extension added in 2005 to add bedroom with ensuite shower room. Certificate of Compliance issued 17th Feb 2006 and council tax updated",
          },
        },
      },
    },
  ];
  expect(validateVerifiedClaims(vClaims)).toEqual([]);
});

test("returns an array of errors if data in the path is in invalid format", () => {
  const vClaims = [
    {
      verification: {
        trust_framework: "uk_pdtf",
        time: "2022-01-25T13:16:44.527Z",
        evidence: [
          {
            verification_method: {
              type: "auth",
            },
            type: "vouch",
            attestation: {
              voucher: {
                name: "Maria Harris",
              },
              type: "digital_attestation",
            },
          },
          {
            type: "document",
            attachments: [
              {
                digest: {
                  alg: "md5",
                  value: "randomHashValue",
                },
                url: "https://fakeFileStore.com/some/kind/of/file",
                desc: "proofOfAddress.pdf",
              },
            ],
          },
        ],
      },
      claims: {
        "/propertyPack/materialFacts/councilTax": {
          councilTaxBand: "D",
          councilTaxAffectingAlterationsINVALID: {
            yesNo: "Yes",
            details:
              "Extension added in 2005 to add bedroom with ensuite shower room. Certificate of Compliance issued 17th Feb 2006 and council tax updated",
          },
        },
      },
    },
  ];
  expect(validateVerifiedClaims(vClaims)).toEqual([
    {
      instancePath: "",
      schemaPath: "#/required",
      keyword: "required",
      params: { missingProperty: "councilTaxAffectingAlterations" },
      message: "must have required property 'councilTaxAffectingAlterations'",
    },
  ]);
});

test("returns an empty array of errors if data in the path is in valid format", () => {
  const vClaims = [
    {
      verification: {
        trust_framework: "uk_pdtf",
        time: "2022-01-25T13:16:44.527Z",
        evidence: [
          {
            verification_method: {
              type: "auth",
            },
            type: "vouch",
            attestation: {
              voucher: {
                name: "Maria Harris",
              },
              type: "digital_attestation",
            },
          },
          {
            type: "document",
            attachments: [
              {
                digest: {
                  alg: "md5",
                  value: "randomHashValue",
                },
                url: "https://fakeFileStore.com/some/kind/of/file",
                desc: "proofOfAddress.pdf",
              },
            ],
          },
        ],
      },
      claims: {
        "/propertyPack/materialFacts/councilTax": {
          councilTaxBand: "D",
          councilTaxAffectingAlterations: {
            yesNo: "Yes",
            details:
              "Extension added in 2005 to add bedroom with ensuite shower room. Certificate of Compliance issued 17th Feb 2006 and council tax updated",
          },
        },
      },
    },
  ];
  expect(validateVerifiedClaims(vClaims)).toEqual([]);
});
