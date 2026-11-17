const {
  getSubschema,
  getSubschemaValidator,
  getOverlayRefKeys,
  pruneToOverlayScope,
  overlaysMap,
} = require("../../../index.js");

const schemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

// The overlay set a live Material Information listing actually runs with.
const NTS_OVERLAYS = [
  "nts2023", "as", "dr", "jk", "sb", "hs", "ph", "sd", "oa", "mc", "pc", "dk",
  "rw", "er", "ma", "tf", "sl", "fd", "sc", "lc", "wg", "mi", "tr", "ac", "ta", "ic",
];

// A leasehold ownership subtree with every NTS-asked question answered. The
// only gap is `hasTenantCompanyDissolved` — a TA7 question that the NTS form
// never renders. Modelled on the transaction that surfaced this.
const leaseholdOwnership = (ownershipAndManagement) => ({
  ownershipsToBeTransferred: [
    {
      titleNumber: "CB328479",
      titlePropertyDescription: "The Leasehold land shown edged with red",
      ownershipType: "Leasehold",
      leaseholdInformation: {
        leaseTerm: { startYearOfLease: 2007, lengthOfLeaseInYears: 120 },
        sharedOwnership: {
          isSharedOwnership: "Yes",
          sharedOwnershipPercentage: 50,
          sharedOwnershipRent: 404,
          sharedOwnershipRentFrequency: "Monthly",
        },
        groundRent: {
          isGroundRentPayable: "No",
          rentSubjectToIncrease: { yesNo: "No" },
        },
        serviceCharge: {
          sellerContributesToServiceCharge: "No",
          transferFees: { yesNo: "No" },
        },
        leaseRestrictions: { yesNo: "No" },
        contactDetails: {
          contacts: {
            managingAgent: {
              contact: {
                nameOrOrganisation: "Cambridge Housing Association",
                emailAddress: "managing.agent@example.com",
              },
            },
          },
        },
        typeOfLeasehold: { leaseholdType: "Shared ownership" },
        requiredDocuments: {
          noticeOfSale: { yesNo: "No" },
          noticeOfBuildingCondition: { yesNo: "No" },
        },
        ...(ownershipAndManagement ? { ownershipAndManagement } : {}),
      },
    },
  ],
});

describe("Overlay scoping", () => {
  describe("a form is not blocked by questions it does not ask", () => {
    // The regression this was written for: an NTS Material Information pack
    // stuck at 95% because a TA7 question it never renders was unanswered.
    test("NTS ownership validates when only TA7-owned questions are unanswered", () => {
      const validator = getSubschemaValidator(
        "/propertyPack/ownership",
        schemaId,
        NTS_OVERLAYS
      );

      expect(
        validator(leaseholdOwnership({ isManagingAgentEmployed: "No" }))
      ).toBe(true);
    });

    test("an empty TA7 sub-object does not block the NTS section either", () => {
      // Partial completion is the trigger: the object exists but carries no
      // discriminating answer, so every oneOf branch passed vacuously.
      const validator = getSubschemaValidator(
        "/propertyPack/ownership",
        schemaId,
        NTS_OVERLAYS
      );

      expect(validator(leaseholdOwnership({}))).toBe(true);
    });

    test("TA7 still requires its own questions", () => {
      // Scoping must not loosen the form that genuinely owns the question.
      const validator = getSubschemaValidator(
        "/propertyPack/ownership/ownershipsToBeTransferred/0/leaseholdInformation/ownershipAndManagement",
        schemaId,
        ["ta7ed5"]
      );

      expect(validator({ isManagingAgentEmployed: "No" })).toBe(false);
      expect(
        validator({
          isManagingAgentEmployed: "No",
          sellerOwnership: { yesNo: "No" },
          hasTenantCompanyDissolved: "No",
        })
      ).toBe(true);
    });
  });

  describe("getOverlayRefKeys", () => {
    test("maps every overlay id in overlaysMap", () => {
      // An unmapped id contributes no ref key, so its fields look
      // unreferenced and get pruned — silently narrowing validation.
      const ids = Object.keys(overlaysMap[schemaId]).filter((id) => id !== "null");

      const unmapped = ids.filter((id) => getOverlayRefKeys([id]) === null);

      expect(unmapped).toEqual([]);
    });

    test("returns null for an unrecognised id so scoping is skipped", () => {
      expect(getOverlayRefKeys(["nts2023", "not-a-real-overlay"])).toBeNull();
    });

    test("ignores null entries rather than treating them as unknown", () => {
      expect(getOverlayRefKeys(["nts2023", null])).toEqual(["ntsRef"]);
    });

    test("includes the TA6 compatibility overlay's marker", () => {
      // `ta` exists so TA6 answers can never invalidate the NTS sections;
      // scoping must not prune away the fields it protects.
      expect(getOverlayRefKeys(["ta"])).toContain("ta6ed6CompatRef");
    });
  });

  describe("scoping is skipped when it cannot be done safely", () => {
    test("an unrecognised overlay leaves the schema unscoped", () => {
      const scoped = getSubschema(
        "/propertyPack/ownership",
        schemaId,
        ["nts2023", "not-a-real-overlay"]
      );
      const leasehold =
        scoped.properties.ownershipsToBeTransferred.items.oneOf[2].properties
          .leaseholdInformation;

      expect(
        leasehold.properties.ownershipAndManagement.properties
          .hasTenantCompanyDissolved
      ).toBeDefined();
    });

    test("a no-overlay call keeps the full shape", () => {
      const full = getSubschema("/propertyPack/ownership", schemaId, undefined);
      const leasehold =
        full.properties.ownershipsToBeTransferred.items.oneOf[2].properties
          .leaseholdInformation;

      expect(
        leasehold.properties.ownershipAndManagement.properties
          .hasTenantCompanyDissolved
      ).toBeDefined();
    });

    test("BASPI fields survive when a BASPI overlay is requested", () => {
      // Regression: an incomplete id mapping pruned every baspi5Ref field,
      // dropping the stopcock/waterMeter requirements.
      const scoped = getSubschema(
        "/propertyPack/waterAndDrainage/water/mainsWater",
        schemaId,
        ["baspiV5", "sc"]
      );
      const yesBranch = scoped.oneOf.find((branch) =>
        branch.properties?.yesNo?.enum?.includes("Yes")
      );

      expect(yesBranch.required).toEqual(
        expect.arrayContaining(["stopcock", "waterMeter"])
      );
    });
  });

  describe("pruneToOverlayScope", () => {
    test("preserves a declared discriminator's tag even when unreferenced", () => {
      // Removing the tag leaves AJV compiling a discriminator whose property
      // is gone: "oneOf subschemas must have properties/<tag>".
      const node = {
        type: "object",
        discriminator: { propertyName: "yesNo" },
        required: ["yesNo"],
        properties: {
          yesNo: { type: "string", enum: ["Yes", "No"] },
          keepMe: { type: "string", ntsRef: "1.1" },
          dropMe: { type: "string", ta7ed5Ref: "4.5" },
        },
        oneOf: [
          { properties: { yesNo: { enum: ["No"] } } },
          { properties: { yesNo: { enum: ["Yes"] } } },
        ],
      };

      const pruned = pruneToOverlayScope(node, ["ntsRef"]);

      expect(pruned.properties.yesNo).toBeDefined();
      expect(pruned.properties.keepMe).toBeDefined();
      expect(pruned.properties.dropMe).toBeUndefined();
      expect(pruned.required).toContain("yesNo");
    });

    test("preserves the inferred tag of a discriminator-less oneOf", () => {
      // The core schema keeps `oneOf` but strips `discriminator`, so the tag
      // has to be recovered from the branches' enums.
      const node = {
        type: "object",
        properties: {
          tag: { type: "string", enum: ["Yes", "No"], ta7ed5Ref: "4.5" },
          other: { type: "string", ntsRef: "1.1" },
        },
        oneOf: [
          { properties: { tag: { enum: ["No"] } } },
          { properties: { tag: { enum: ["Yes"] } } },
        ],
      };

      const pruned = pruneToOverlayScope(node, ["ntsRef"]);

      expect(pruned.properties.tag).toBeDefined();
    });

    test("inherits tags into oneOf branches and array items", () => {
      // The tag property lives inside the branches, not beside them.
      const node = {
        type: "array",
        items: {
          type: "object",
          discriminator: { propertyName: "kind" },
          oneOf: [
            {
              properties: {
                kind: { enum: ["A"] },
                unreferenced: { type: "string", ta7ed5Ref: "4.5" },
              },
            },
            { properties: { kind: { enum: ["B"] } } },
          ],
        },
      };

      const pruned = pruneToOverlayScope(node, ["ntsRef"]);

      expect(pruned.items.oneOf[0].properties.kind).toBeDefined();
      expect(pruned.items.oneOf[1].properties.kind).toBeDefined();
      expect(pruned.items.oneOf[0].properties.unreferenced).toBeUndefined();
    });

    test("drops a pruned property from its parent's required list", () => {
      const node = {
        type: "object",
        required: ["keepMe", "dropMe"],
        properties: {
          keepMe: { type: "string", ntsRef: "1.1" },
          dropMe: { type: "string", ta7ed5Ref: "4.5" },
        },
      };

      const pruned = pruneToOverlayScope(node, ["ntsRef"]);

      expect(pruned.required).toEqual(["keepMe"]);
    });

    test("keeps a branch of fields reachable only through a nested ref", () => {
      const node = {
        type: "object",
        properties: {
          wrapper: {
            type: "object",
            properties: { inner: { type: "string", ntsRef: "1.1" } },
          },
        },
      };

      const pruned = pruneToOverlayScope(node, ["ntsRef"]);

      expect(pruned.properties.wrapper.properties.inner).toBeDefined();
    });
  });

  describe("every live overlay set still compiles", () => {
    test.each([
      ["listing", NTS_OVERLAYS],
      ["property-questions", ["ta6ed6"]],
      ["leasehold-questions", ["ta7ed5"]],
      ["fittings-and-contents", ["ta10ed3"]],
      ["sale-ready", ["sr24"]],
    ])("%s", (_label, overlays) => {
      const validator = getSubschemaValidator("/propertyPack", schemaId, overlays);

      expect(typeof validator).toBe("function");
      expect(() => validator({})).not.toThrow();
    });
  });
});
