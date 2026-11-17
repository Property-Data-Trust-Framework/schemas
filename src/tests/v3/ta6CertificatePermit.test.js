// Ported from upstream PDTF dev PR 177 (TA6 certificate and permit omissions). Upstream runs
// these against both ta6ed6 and ta6ed6v2; here there is one TA6 6th-edition overlay.
const {
  getTransactionSchema,
  getSubschema,
  getSubschemaValidator,
} = require("../../../index.js");
const schemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";
const electricalPath = "/propertyPack/electricalWorks/electricalWorkSince2005";
const certificatePath = `${electricalPath}/suppliedCertificate`;
const drainagePath =
  "/propertyPack/waterAndDrainage/drainage/mainsFoulDrainage/offMainsDrainageSystem";
const types = ["Septic tank", "Cesspit", "Sewerage treatment plant", "Other"];
const drainage = (type, permitDocuments) => ({
  offMainsDrainageSystemType: type,
  otherConnectedProperties: { yesNo: "No" },
  plantOnOtherLand: { yesNo: "No" },
  plantDrainsIntoWaterway: { yesNo: "Yes" },
  dateDischargeCommenced: "2020-01-01",
  dateInstalled: "2020-01-01",
  dateLastEmptied: "2025-01-01",
  dateLastServiced: "2025-01-01",
  supplier: "Provider",
  makeModel: "Model",
  serviceProviderName: "Servicer",
  ...(permitDocuments === undefined ? {} : { permitDocuments }),
});

describe.each(["ta6ed6"])(
  "%s certificate and permit omissions",
  (overlay) => {
    const validate = getSubschemaValidator(electricalPath, schemaId, [overlay]);
    test.each([
      [{ yesNo: "No" }, true],
      [{ yesNo: "Yes" }, true],
      [{ yesNo: "Yes", attachments: "Attached" }, true],
      [{ yesNo: "Yes", attachments: "To follow" }, true],
      [{ attachments: "Attached" }, true],
      [{ attachments: "To follow" }, true],
      [{}, true],
      [{ yesNo: "Maybe" }, false],
      [{ yesNo: "" }, false],
      [{ yesNo: null }, false],
      [{ attachments: "Not available" }, false],
      [{ yesNo: "No", attachments: "Attached" }, true],
    ])(
      "electrical works with certificate %j validates as %s",
      (suppliedCertificate, expected) => {
        const record = {
          yesNo: "Yes",
          details: "Work carried out",
          suppliedCertificate,
        };
        const original = JSON.parse(JSON.stringify(record));
        expect(validate(record)).toBe(expected);
        expect(record).toEqual(original); // no default/inferred No on reads or validation
      },
    );
    test("certificate answer is flat, optional and separately referenced", () => {
      const schema = getSubschema(certificatePath, schemaId, [overlay]);
      expect(schema.required || []).toEqual([]);
      expect(schema.discriminator).toBeUndefined();
      expect(schema.oneOf).toBeUndefined();
      expect(schema.properties.yesNo.default).toBeUndefined();
      expect(schema.properties.yesNo[`${overlay}Ref`]).toBe("11.2.1");
      expect(schema.properties.attachments[`${overlay}Ref`]).toBe("11.2.2");
      expect(
        getTransactionSchema(schemaId, [overlay]).properties.propertyPack
          .properties.electricalWorks.properties.electricalWorkSince2005
          .oneOf[1].properties.suppliedCertificate.properties.certificateType,
      ).toBeDefined();
    });
    describe.each(types)("%s permit documents", (type) => {
      test.each([
        ["Attached", true],
        ["To follow", true],
        ["Not applicable", true],
        [undefined, true],
        ["Maybe", false],
        ["", false],
        [null, false],
      ])("%s validates as %s", (value, expected) => {
        const validateDrainage = getSubschemaValidator(drainagePath, schemaId, [
          overlay,
        ]);
        const record = drainage(type, value);
        expect(validateDrainage(record)).toBe(expected);
        if (value === undefined)
          expect(record).not.toHaveProperty("permitDocuments");
      });
      test("keeps the ref and optionality in each applicable branch", () => {
        const schema = getSubschema(drainagePath, schemaId, [overlay]);
        const branch = schema.oneOf.find((b) =>
          b.properties.offMainsDrainageSystemType.enum.includes(type),
        );
        expect(branch.properties.permitDocuments[`${overlay}Ref`]).toBe(
          "11.7j",
        );
        expect(branch.required || []).not.toContain("permitDocuments");
      });
    });
  },
);

test.each(["baspiV4", "baspiV5", "ta6ed4"])(
  "%s preserves its certificate requiredness",
  (overlay) => {
    const schema = getSubschema(certificatePath, schemaId, [overlay]);
    expect(schema.required).toEqual(["certificateType", "attachments"]);
  },
);
