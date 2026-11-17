const traverse = require("traverse");
const {
  getTransactionSchema,
  getSubschemaValidator,
} = require("../../../index.js");
const combined = require("../../schemas/v3/combined.json");
const ta6ed6Overlay = require("../../schemas/v3/overlays/ta6ed6.json");

const schemaId =
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

// Form-faithful TA6 6th-edition shapes for heating (§11.4), alterations (§5) and the
// company seller (§1.6). These were introduced as a separate `ta6ed6v2` overlay and are
// now the single `ta6ed6` shape; see ta6ed6.test.js for the rest of the overlay.
describe("TA6 Edition 6 — form-faithful shapes", () => {
  describe("Overlay integrity", () => {
    test("there is a single TA6 6th-edition overlay (no ta6ed6v2 markers remain)", () => {
      expect(JSON.stringify(combined)).not.toMatch(/ta6ed6v2/);
    });

    test("every discriminator gate carries ta6ed6Ref on its discriminator property (so the FE renders the gate)", () => {
      // The renderer keeps only properties carrying the overlay ref; a discriminator
      // (yesNo) gate without its own ref would be dropped and the gate wouldn't render.
      const missing = [];
      traverse(ta6ed6Overlay).forEach(function () {
        const n = this.node;
        if (n && typeof n === "object" && !Array.isArray(n) && n.discriminator && n.discriminator.propertyName) {
          const prop = n.properties && n.properties[n.discriminator.propertyName];
          if (!prop || !prop.ta6ed6Ref) missing.push("/" + this.path.join("/"));
        }
      });
      expect(missing).toEqual([]);
    });
  });

  describe("Heating §11.4 — multiSelect of main heating types", () => {
    const merged = () => getTransactionSchema(schemaId, ["ta6ed6"]);
    const v = () => getSubschemaValidator("/propertyPack/heating", schemaId, ["ta6ed6"]);
    const omit = (o, k) => { const c = { ...o }; delete c[k]; return c; };
    // a heating object with every required field populated
    const full = (over = {}) => ({
      mainHeatingTypes: ["Mains gas"], heatingInstalledDate: "Not known",
      boilerInstalledDate: "2018-01-01", heatingSystemReplaced: "No",
      complianceCertificates: "None", inspectionReport: "To follow",
      inGoodWorkingOrder: "Yes", lastServicedYear: "2022", ...over,
    });

    const renderedHeatingFields = () => {
      const props = ta6ed6Overlay.properties.propertyPack.properties.heating.properties;
      return Object.keys(props).filter((k) => props[k].ta6ed6Ref); // rendered fields, in order
    };

    test("main heating is a multiSelect directly under heating (no heatingType), in form order", () => {
      const mht = merged().properties.propertyPack.properties.heating.properties.mainHeatingTypes;
      expect(mht.type).toBe("array");
      expect(mht.items.enum).toEqual([
        "Mains gas", "Oil", "Heat pumps", "Liquid gas", "Electricity",
        "Underfloor", "Woodburning / multi-fuel stove", "Other",
      ]);
      // rendered heating fields, in schema order, must match form order (11.4, 11.4a..h),
      // followed by §12.2 mainsGas, which lives in the heating task
      expect(renderedHeatingFields()).toEqual([
        "mainHeatingTypes", "mainHeatingTypesOtherDetails",
        "heatingInstalledDate", "boilerInstalledDate", "heatingSystemReplaced",
        "complianceCertificates", "inspectionReport", "inGoodWorkingOrder",
        "lastServicedYear", "lastServicedReport", "multipleHeatingSystems",
        "mainsGas",
      ]);
    });

    test("11.4(c)-(g) offer exactly the form's answer options", () => {
      const heating = merged().properties.propertyPack.properties.heating.properties;
      expect(heating.heatingSystemReplaced.enum).toEqual(["Yes", "No", "Not known"]);
      expect(heating.complianceCertificates.enum).toEqual(["Attached", "To follow", "None"]);
      expect(heating.inspectionReport.enum).toEqual(["Attached", "To follow", "None"]);
      expect(heating.inGoodWorkingOrder.enum).toEqual(["Yes", "No", "Not known"]);
      expect(heating.lastServicedReport.enum).toEqual(["Attached", "To follow"]);
    });

    test("all heating fields required except mainHeatingTypesOtherDetails and lastServicedReport", () => {
      expect(merged().properties.propertyPack.properties.heating.required).toEqual([
        "mainHeatingTypes", "heatingInstalledDate", "boilerInstalledDate",
        "heatingSystemReplaced", "complianceCertificates", "inspectionReport",
        "inGoodWorkingOrder", "lastServicedYear",
      ]);
      const val = v();
      expect(val(full())).toBe(true);
      expect(val(omit(full(), "inGoodWorkingOrder"))).toBe(false);          // required
      expect(val(omit(full(), "lastServicedYear"))).toBe(false);            // required
      expect(val(omit(full(), "mainHeatingTypesOtherDetails"))).toBe(true); // optional (absent anyway)
      expect(val(full({ lastServicedReport: "Attached" }))).toBe(true);     // optional, allowed when present
    });

    test("heatingType, heatingSystem and the fudged otherHeatingFeatures are not rendered", () => {
      const heating = ta6ed6Overlay.properties.propertyPack.properties.heating;
      expect("heatingSystem" in heating.properties).toBe(false);
      expect("otherHeatingFeatures" in heating.properties).toBe(false);
      expect("mainHeatingTypes" in heating.properties).toBe(true);
    });

    test("valid heating passes; unknown main-heating type fails", () => {
      const val = v();
      expect(val(full())).toBe(true);
      expect(val(full({ mainHeatingTypes: ["Nuclear"] }))).toBe(false);
    });

    test("11.4a/11.4b accept a date or 'Not known'; 11.4g year is a 2- or 4-digit string or 'Not known'", () => {
      const val = v();
      expect(val(full({ heatingInstalledDate: "2019-06-01" }))).toBe(true);
      expect(val(full({ heatingInstalledDate: "Not known" }))).toBe(true);
      expect(val(full({ heatingInstalledDate: "someday" }))).toBe(false);
      expect(val(full({ boilerInstalledDate: "2019-06-01" }))).toBe(true);
      expect(val(full({ boilerInstalledDate: "Not known" }))).toBe(true);
      expect(val(full({ boilerInstalledDate: "someday" }))).toBe(false);
      for (const ok of ["2024", "24", "Not known"]) {
        expect(val(full({ lastServicedYear: ok }))).toBe(true);
      }
      // integer years are no longer valid (LMS: oneOf integer|string is unrepresentable in typed C#)
      for (const bad of [2024, "0", "202", "-1", "abc", ""]) {
        expect(val(full({ lastServicedYear: bad }))).toBe(false);
      }
    });

    test("11.4g lastServicedYear is a single string type with a pattern (no oneOf)", () => {
      const lsy = merged().properties.propertyPack.properties.heating.properties.lastServicedYear;
      expect(lsy.type).toBe("string");
      expect(lsy.pattern).toBe("^(\\d{2}|\\d{4}|Not known)$");
      expect(lsy.oneOf).toBeUndefined();
    });

    test("11.4h multipleHeatingSystems is trimmed to the form's two options and optional", () => {
      const heating = merged().properties.propertyPack.properties.heating;
      expect(heating.properties.multipleHeatingSystems.enum).toEqual(["Attached", "To follow"]);
      expect(heating.required).not.toContain("multipleHeatingSystems");
    });
  });

  // Ported from upstream PDTF dev PRs 173 and 175 (ta6ed6v2 §12.2 mains gas), retargeted at ta6ed6.
  describe("Mains gas §12.2 — supply-level gas under heating, independent of heatingType", () => {
    const MG = "/propertyPack/heating/mainsGas";
    const yes = (over = {}) => ({
      yesNo: "Yes", supplier: "British Gas",
      gasMeter: { location: "Under the stairs", mprn: "1234567890" }, ...over,
    });

    test("mainsGas is optional: heating without it still validates", () => {
      const heating = getTransactionSchema(schemaId, ["ta6ed6"]).properties.propertyPack.properties.heating;
      expect(heating.required).not.toContain("mainsGas");
      const v = getSubschemaValidator("/propertyPack/heating", schemaId, ["ta6ed6"]);
      expect(v({
        mainHeatingTypes: ["Mains gas"], heatingInstalledDate: "Not known",
        boilerInstalledDate: "2018-01-01", heatingSystemReplaced: "No",
        complianceCertificates: "None", inspectionReport: "To follow",
        inGoodWorkingOrder: "Yes", lastServicedYear: "2022",
      })).toBe(true);
    });

    test("mainsGas is flat and nothing in it is required, so existing heating tasks stay complete", () => {
      const mg = getTransactionSchema(schemaId, ["ta6ed6"]).properties.propertyPack.properties
        .heating.properties.mainsGas;
      expect(Object.keys(mg.properties)).toEqual(["yesNo", "supplier", "gasMeter"]);
      const structural = [];
      traverse(mg).forEach(function () {
        if (["required", "discriminator", "oneOf"].includes(this.key)) structural.push(this.path.join("/"));
      });
      expect(structural).toEqual([]);
    });

    test("12.2.1 to 12.2.4 carry the form's references", () => {
      const mg = ta6ed6Overlay.properties.propertyPack.properties.heating.properties.mainsGas;
      expect(mg.ta6ed6Ref).toBe("12.2");
      expect(mg.properties.yesNo.ta6ed6Ref).toBe("12.2.1");
      expect(mg.properties.supplier.ta6ed6Ref).toBe("12.2.2");
      expect(mg.properties.gasMeter.properties.location.ta6ed6Ref).toBe("12.2.3");
      expect(mg.properties.gasMeter.properties.mprn.ta6ed6Ref).toBe("12.2.4");
    });

    test("any partial answer validates; only the Yes/No values are enforced", () => {
      const v = getSubschemaValidator(MG, schemaId, ["ta6ed6"]);
      expect(v({})).toBe(true);
      expect(v({ yesNo: "No" })).toBe(true);
      expect(v(yes())).toBe(true);
      expect(v({ yesNo: "Yes" })).toBe(true);
      expect(v({ supplier: "EDF" })).toBe(true);
      expect(v(yes({ gasMeter: {} }))).toBe(true);
      expect(v(yes({ gasMeter: { location: "" } }))).toBe(true);
      expect(v({ yesNo: "No", supplier: "EDF" })).toBe(true); // follow-ons aren't gated on Yes
      expect(v({ yesNo: "To be connected" })).toBe(false); // form offers Yes/No only
    });

    test("gas can be recorded whatever the heating fuel, with no heatingType", () => {
      const v = getSubschemaValidator("/propertyPack/heating", schemaId, ["ta6ed6"]);
      expect(v({
        mainHeatingTypes: ["Oil"], heatingInstalledDate: "Not known",
        boilerInstalledDate: "2018-01-01", heatingSystemReplaced: "No",
        complianceCertificates: "None", inspectionReport: "To follow",
        inGoodWorkingOrder: "Yes", lastServicedYear: "2022", mainsGas: yes(),
      })).toBe(true);
    });

    test("mainsGas carries ta6ed6 refs only, so no other overlay renders it", () => {
      for (const ov of ["nts2023", "baspiV5"]) {
        const heating = getTransactionSchema(schemaId, [ov]).properties.propertyPack.properties.heating;
        expect(heating.properties.mainsGas.title).toBe("Mains gas"); // base title, no form override
        expect(heating.required || []).not.toContain("mainsGas");
      }
      const mg = traverse(combined).get(["properties", "propertyPack", "properties", "heating", "properties", "mainsGas"]);
      const refKeys = new Set();
      traverse(mg).forEach(function () { if (/Ref$/.test(this.key || "")) refKeys.add(this.key); });
      expect([...refKeys]).toEqual(["ta6ed6Ref"]);
    });
  });

  describe("Alterations §5 — hasStructuralAlterations gate + multi-item array + unified details", () => {
    const HSA = "/propertyPack/alterationsAndChanges/hasStructuralAlterations";

    test("one hasStructuralAlterations object (no per-type nodes, no separate alterationDetails)", () => {
      const alt = ta6ed6Overlay.properties.propertyPack.properties.alterationsAndChanges;
      const rendered = Object.keys(alt.properties).filter((k) => alt.properties[k].ta6ed6Ref);
      expect(rendered).toEqual([
        "hasStructuralAlterations", "nonResidentialPurposes",
        "planningPermissionBreaches", "unresolvedPlanningIssues",
      ]);
      expect("alterationDetails" in alt.properties).toBe(false);
    });

    test("Yes-branch holds the multi-item array first, then the unified details (form order)", () => {
      const hsa = getTransactionSchema(schemaId, ["ta6ed6"]).properties.propertyPack.properties
        .alterationsAndChanges.properties.hasStructuralAlterations;
      const yes = hsa.oneOf.find((o) => o.properties && o.properties.alterationTypes);
      const order = ["alterationTypes", "details", "workCompleted", "documents", "approvalsObtained", "approvalsNotRequiredReason"];
      expect(Object.keys(yes.properties).filter((k) => order.includes(k))).toEqual(order);
      expect(yes.properties.alterationTypes.items.enum).toEqual([
        "Replacement windows, roof windows, roof lights, glazed doors since 1 April 2002",
        "Extension", "Conservatory", "Loft conversion", "Garage conversion",
        "Removal of internal walls", "Removal of chimney breast", "Insulation",
        "Other building works or changes to the property",
      ]);
    });

    test("5.2(c) and 5.2(d) offer the form's answer options", () => {
      const hsa = getTransactionSchema(schemaId, ["ta6ed6"]).properties.propertyPack.properties
        .alterationsAndChanges.properties.hasStructuralAlterations;
      const yes = hsa.oneOf.find((o) => o.properties && o.properties.alterationTypes);
      expect(yes.properties.documents.enum).toEqual(["Attached", "To follow", "Not available"]);
      expect(yes.properties.approvalsObtained.enum).toEqual(["Yes", "No"]);
      expect(yes.properties.approvalsNotRequiredReason.type).toBe("string");

      const v = getSubschemaValidator(HSA, schemaId, ["ta6ed6"]);
      expect(v({
        yesNo: "Yes",
        alterationTypes: ["Extension"],
        details: "x",
        documents: "Not available",
        approvalsObtained: "No",
        approvalsNotRequiredReason: "Permitted development",
      })).toBe(true);
      expect(v({
        yesNo: "Yes",
        alterationTypes: ["Extension"],
        details: "x",
        documents: "Not available",
        approvalsObtained: "Maybe",
        approvalsNotRequiredReason: "Permitted development",
      })).toBe(false);
    });

    test("No gate validates; Yes requires types + details; enums enforced", () => {
      const v = getSubschemaValidator(HSA, schemaId, ["ta6ed6"]);
      expect(v({ yesNo: "No" })).toBe(true);
      expect(v({ yesNo: "Yes", alterationTypes: ["Extension"], details: "Rear extension 2019" })).toBe(true);
      expect(v({ yesNo: "Yes" })).toBe(false); // alterationTypes + details required
      expect(v({ yesNo: "Yes", alterationTypes: ["Nope"], details: "x" })).toBe(false); // bad type
      expect(v({ yesNo: "Yes", alterationTypes: ["Extension"], details: "x", documents: "Maybe" })).toBe(false); // bad enum
    });
  });

  describe("Per-type alteration nodes are no longer part of the TA6 6th-edition form", () => {
    const perTypeNodes = [
      "windowReplacementsSince2002", "extension", "hasAddedConservatory", "loftConversion",
      "garageConversion", "removalOfInternalWalls", "removalOfChimneyBreast", "insulation",
      "otherBuildingWorksOrChangesToTheProperty",
    ];

    test("the nine per-type nodes are absent from the ta6ed6 overlay", () => {
      const alt = ta6ed6Overlay.properties.propertyPack.properties.alterationsAndChanges.properties;
      for (const k of perTypeNodes) {
        expect(alt[k]).toBeUndefined();
      }
    });

    // Kept in core: other forms use some of them (BASPI, PIQ, TA6 ed4, SEF25), and existing
    // 6th-edition answers stored at these paths are read when carrying answers forward.
    test("the nine per-type nodes remain in the core schema", () => {
      const alt = combined.properties.propertyPack.properties.alterationsAndChanges.properties;
      for (const k of perTypeNodes) {
        expect(alt[k]).toBeDefined();
      }
    });
  });

  describe("Heating coexistence with NTS/BASPI (shared-state validation)", () => {
    // TA6 ed6 models the form's heating SOURCE (mainHeatingTypes, directly under heating).
    // NTS/BASPI require the ARRANGEMENT (heatingSystem.heatingType). Different axes on
    // different paths, so a single heating object carries both and validates under every
    // overlay. The platform re-enters heatingType (and centralHeatingDetails) for NTS/BASPI.
    const H = "/propertyPack/heating";
    const valid = (ov, obj) => getSubschemaValidator(H, schemaId, [ov])(obj);
    // a complete TA6 ed6 heating fill (all required fields)
    const ed6Full = {
      mainHeatingTypes: ["Electricity"], heatingInstalledDate: "Not known",
      boilerInstalledDate: "Not known", heatingSystemReplaced: "No",
      complianceCertificates: "None", inspectionReport: "None",
      inGoodWorkingOrder: "Yes", lastServicedYear: "Not known",
    };

    test("a dual-populated heating object validates under TA6 ed6, NTS and BASPI", () => {
      const obj = { ...ed6Full, heatingSystem: { heatingType: "Room heaters only" } };
      expect(valid("ta6ed6", obj)).toBe(true);
      expect(valid("nts2025", obj)).toBe(true);
      expect(valid("baspiV5", obj)).toBe(true);
    });

    test("a complete TA6 ed6 heating fill is NOT NTS/BASPI-complete — heatingSystem still required", () => {
      expect(valid("ta6ed6", ed6Full)).toBe(true);
      expect(valid("nts2025", ed6Full)).toBe(false); // NTS requires heatingSystem.heatingType
      expect(valid("baspiV5", ed6Full)).toBe(false);
    });
  });

  describe("Company seller details §1.6 — refs aligned to the form", () => {
    const companyBranch = (ov) => {
      const part = getTransactionSchema(schemaId, [ov]).properties.participants.items;
      const cap = part.oneOf[2].properties.sellersCapacity.oneOf[2].properties;
      return cap;
    };
    const refOf = (props, name, refKey) => props[name] && props[name][refKey];

    test("collects director/authorised person (1.6.2) and points companyNumber at the form's 1.6.1", () => {
      const company = companyBranch("ta6ed6");
      expect(company.directorOrAuthorisedPerson).toBeDefined();
      expect(refOf(company, "directorOrAuthorisedPerson", "ta6ed6Ref")).toBe("1.6.2");
      expect(refOf(company, "companyNumber", "ta6ed6Ref")).toBe("1.6.1");
      expect(refOf(company, "countryOfIncorporation", "ta6ed6Ref")).toBe("1.6.3");
      // companyName is not a form §1.6 sub-field
      expect(refOf(company, "companyName", "ta6ed6Ref")).toBeUndefined();
    });
  });

  describe("Section 9 — one ref per form question (LMS Action 40)", () => {
    const rights = (overlay) =>
      overlay.properties.propertyPack.properties.rightsAndInformalArrangements.properties;

    // 9.3 and 9.6 each appeared on two sibling branches, so a
    // seller answering Yes to both parents was asked one form question twice, into two
    // separate storage paths.
    test.each(["ta6ed6Ref"])(
      "%s 9.3 and 9.6 each appear exactly once in combined.json",
      (marker) => {
        const counts = {};
        traverse(combined).forEach(function () {
          if (!this.node || typeof this.node !== "object" || Array.isArray(this.node)) return;
          const ref = this.node[marker];
          if (ref) counts[ref] = (counts[ref] || 0) + 1;
        });
        expect(counts["9.3"]).toBe(1);
        expect(counts["9.6"]).toBe(1);
      }
    );

    test.each([["ta6ed6", ta6ed6Overlay]])(
      "%s surfaces 9.3 unconditionally but only REQUIRES it on the 9.1=Yes branch",
      (_name, overlay) => {
        // Declared at parent level so the question is rendered whatever 9.1 says, while
        // the requirement stays inside oneOf[1]. That combination is what keeps this
        // change safe even if signed forms turn out to be re-validated: a signed form
        // with 9.1=No and no 9.3 answer was valid before and is still valid now.
        // The stored path is unchanged either way — oneOf branches add no path segment.
        const nlr = rights(overlay).neighbouringLandRights;
        expect(nlr.properties.disagreementOrComplaint).toBeDefined();
        expect(nlr.required).not.toContain("disagreementOrComplaint");
        expect(nlr.oneOf[1].required).toContain("disagreementOrComplaint");
      }
    );

    // Guards the property the whole PR rests on: no document that validated before may
    // fail now. Relaxations (invalid -> valid) are fine; regressions are not.
    test.each(["ta6ed6"])(
      "%s: no previously-valid section 9 / 2.5 document becomes invalid",
      (ov) => {
        const dis = [
          undefined,
          { yesNo: "No" },
          { yesNo: "Yes", details: "x" },
          { yesNo: "Not known" },
        ];
        const targets = [
          ["/propertyPack/rightsAndInformalArrangements/neighbouringLandRights", ["Yes", "No"]],
          ["/propertyPack/rightsAndInformalArrangements/sharedContributions", ["Yes", "No", "Not applicable"]],
          ["/propertyPack/rightsAndInformalArrangements/askedOthersToContribute", ["Yes", "No", "Not applicable"]],
          ["/propertyPack/notices/partyWallAct", ["Yes", "No"]],
        ];
        const regressions = [];
        for (const [path, parentEnum] of targets) {
          const validate = getSubschemaValidator(path, schemaId, [ov]);
          for (const pv of parentEnum) {
            for (const d of dis) {
              for (const hasDetails of [true, false]) {
                const doc = { yesNo: pv };
                if (hasDetails) doc.details = "d";
                if (d) doc.disagreementOrComplaint = JSON.parse(JSON.stringify(d));
                // the shapes that must keep validating are those a signed form could hold:
                // any answer to the parent, with 9.3 absent on the non-Yes branches
                const mustStayValid = pv !== "Yes" && !d;
                if (mustStayValid && !validate(doc)) {
                  regressions.push({ path, doc, errors: validate.errors });
                }
              }
            }
          }
        }
        expect(regressions).toEqual([]);
      }
    );

    test.each([["ta6ed6", ta6ed6Overlay]])(
      "%s no longer duplicates 9.3/9.6 onto sibling branches",
      (_name, overlay) => {
        const r = rights(overlay);
        expect(r.sharedContributions.oneOf[1].properties.disagreementOrComplaint).toBeUndefined();
        expect(r.askedOthersToContribute.oneOf[1].properties.disagreementOrComplaint).toBeUndefined();
        // 9.6 keeps its existing unconditional home under rightsOrArrangements (9.4)
        expect(r.rightsOrArrangements.properties.disagreementOrComplaint).toBeDefined();
      }
    );

    test.each([["ta6ed6", ta6ed6Overlay]])(
      "%s surfaces the 2.5 party wall attachment slot, optionally",
      (_name, overlay) => {
        const yesBranch =
          overlay.properties.propertyPack.properties.notices.properties.partyWallAct.oneOf[1];
        expect(yesBranch.properties.attachments).toBeDefined();
        // optional on purpose: required would prompt "requires completion" on unsigned
        // in-flight forms for no gain
        expect(yesBranch.required || []).not.toContain("attachments");
      }
    );
  });
});
