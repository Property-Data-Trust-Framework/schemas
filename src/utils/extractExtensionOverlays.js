const traverse = require("traverse");
const jp = require("jsonpointer");
const fs = require("fs");
const path = require("path");

const combinedSchema = require("../schemas/v3/combined.json");

// Derive ref-related field names from a refType
function getRefConfig(refType) {
  if (refType === "nts2Ref") {
    // Legacy mapping: nts2Ref -> ntsRef in output
    return {
      ref: "nts2Ref",
      outputRef: "ntsRef",
      required: "nts2Required",
      title: "nts2Title",
      description: "nts2Description",
      enumKey: "nts2Enum",
    };
  }
  if (refType === "sef25Ref") {
    // SEF25 extensions also appear as ntsRef in output
    return {
      ref: "sef25Ref",
      outputRef: "ntsRef",
      required: "sef25Required",
      title: "sef25Title",
      description: "sef25Description",
      enumKey: "sef25Enum",
    };
  }
  // For other ref types, derive keys by replacing "Ref" suffix
  return {
    ref: refType,
    outputRef: refType,
    required: refType.replace("Ref", "Required"),
    title: refType.replace("Ref", "Title"),
    description: refType.replace("Ref", "Description"),
    enumKey: refType.replace("Ref", "Enum"),
  };
}

// Define the extension overlay mappings
const extensionMappings = {
  // Outside areas
  oa: {
    name: "outsideAreas",
    description: "Outside areas extension for NTS",
    paths: [
      "/properties/propertyPack/properties/residentialPropertyFeatures/properties/outsideAreas",
    ],
  },

  // Estate rentcharges for freehold
  er: {
    name: "estateRentcharges",
    description: "Estate rentcharges for freehold properties",
    paths: [
      "/properties/propertyPack/properties/ownership/properties/ownershipsToBeTransferred/items/oneOf/0/properties/estateRentcharges",
    ],
  },

  // Managing agent contact details for leasehold
  ma: {
    name: "managingAgent",
    description: "Managing agent contact details for leasehold",
    paths: [
      "/properties/propertyPack/properties/ownership/properties/ownershipsToBeTransferred/items/oneOf/2/properties/leaseholdInformation/properties/contactDetails",
    ],
  },

  // Transfer fees for leasehold
  tf: {
    name: "transferFees",
    description: "Transfer fees for leasehold",
    paths: [
      "/properties/propertyPack/properties/ownership/properties/ownershipsToBeTransferred/items/oneOf/2/properties/leaseholdInformation/properties/serviceCharge/oneOf/1/properties/transferFees",
    ],
  },

  // Main construction type if standard
  mc: {
    name: "mainConstruction",
    description: "Main construction type if standard form",
    paths: [
      "/properties/propertyPack/properties/typeOfConstruction/properties/isStandardForm/oneOf/0/properties/constructionType",
    ],
  },

  // Loft access and details
  la: {
    name: "loftAccess",
    description: "Loft access and details",
    paths: [
      "/properties/propertyPack/properties/typeOfConstruction/properties/loft",
    ],
  },

  // Spray foam insulation
  sf: {
    name: "sprayFoam",
    description: "Spray foam insulation",
    paths: [
      "/properties/propertyPack/properties/typeOfConstruction/properties/sprayFoamInsulation",
    ],
  },

  // Specialist issues - dry rot
  dr: {
    name: "dryRot",
    description: "Dry rot treatment specialist issue",
    paths: [
      "/properties/propertyPack/properties/specialistIssues/properties/dryRotEtcTreatment",
    ],
  },

  // Specialist issues - asbestos
  as: {
    name: "asbestos",
    description: "Asbestos specialist issue",
    paths: [
      "/properties/propertyPack/properties/specialistIssues/properties/containsAsbestos",
    ],
  },

  // Specialist issues - Japanese knotweed
  jk: {
    name: "japaneseKnotweed",
    description: "Japanese knotweed specialist issue",
    paths: [
      "/properties/propertyPack/properties/specialistIssues/properties/japaneseKnotweed",
    ],
  },

  // Specialist issues - subsidence
  sb: {
    name: "subsidence",
    description: "Subsidence or structural fault specialist issue",
    paths: [
      "/properties/propertyPack/properties/specialistIssues/properties/subsidenceOrStructuralFault",
    ],
  },

  // Specialist issues - health and safety
  hs: {
    name: "healthSafety",
    description: "Health and safety specialist issue",
    paths: [
      "/properties/propertyPack/properties/specialistIssues/properties/ongoingHealthOrSafetyIssue",
    ],
  },

  // Solar panels leased
  sl: {
    name: "solarPanelsLeased",
    description: "Solar panels ownership details",
    paths: [
      "/properties/propertyPack/properties/electricity/properties/solarPanels/oneOf/1/properties/panelsOwnedOutright",
    ],
  },

  // Heating installation date
  hi: {
    name: "heatingInstalled",
    description: "Central heating installation date",
    paths: [
      "/properties/propertyPack/properties/heating/properties/heatingSystem/oneOf/1/properties/centralHeatingDetails/properties/centralHeatingInstalled",
    ],
  },

  // Flood defences
  fd: {
    name: "floodDefences",
    description: "Flood defence information",
    paths: [
      "/properties/propertyPack/properties/environmentalIssues/properties/flooding/properties/floodDefences",
    ],
  },

  // Other property in chain
  oc: {
    name: "otherPropertyChain",
    description: "Other property in chain dependency",
    paths: [
      "/properties/propertyPack/properties/completionAndMoving/properties/otherPropertyInChain",
    ],
  },

  // Private supply costs (water & sewerage)
  sc: {
    name: "supplyCosts",
    description: "Associated costs for private water and sewerage supply",
    refType: "sef25Ref",
    paths: [
      "/properties/propertyPack/properties/waterAndDrainage/properties/water/properties/mainsWater/oneOf/0/properties/associatedCost",
      "/properties/propertyPack/properties/waterAndDrainage/properties/drainage/properties/mainsFoulDrainage/oneOf/2/properties/associatedCost",
    ],
  },

  // Parking permit costs
  pc: {
    name: "parkingPermitCost",
    description: "Parking permit cost and frequency",
    refType: "sef25Ref",
    paths: [
      "/properties/propertyPack/properties/parking/properties/controlledParking/oneOf/1/properties/costOfPermit",
      "/properties/propertyPack/properties/parking/properties/controlledParking/oneOf/1/properties/costOfPermitFrequency",
    ],
  },

  // Property hazards
  ph: {
    name: "propertyHazards",
    description: "Property hazards and known issues",
    refType: "sef25Ref",
    paths: [
      "/properties/propertyPack/properties/specialistIssues",
    ],
  },

  // Dropped kerb access to parking
  dk: {
    name: "droppedKerbAccess",
    description: "Dropped kerb access to parking",
    refType: "sef25Ref",
    paths: [
      "/properties/propertyPack/properties/parking/properties/droppedKerbAccess",
    ],
  },

  // Private right of way
  rw: {
    name: "privateRightOfWay",
    description: "Private right of way",
    refType: "sef25Ref",
    paths: [
      "/properties/propertyPack/properties/rightsAndInformalArrangements/properties/rightsOrArrangements/properties/privateRightOfWay",
    ],
  },

  // Storm, fire or flood damage
  sd: {
    name: "stormFireFloodDamage",
    description: "Storm, fire or flood damage",
    refType: "sef25Ref",
    paths: [
      "/properties/propertyPack/properties/environmentalIssues/properties/stormFireFloodDamage",
    ],
  },

  // Solar panel lease costs
  lc: {
    name: "solarLeaseCosts",
    description: "Solar panel lease costs",
    refType: "sef25Ref",
    paths: [
      "/properties/propertyPack/properties/electricity/properties/solarPanels/oneOf/1/properties/panelsOwnedOutright/oneOf/1/properties/associatedCost",
    ],
  },

  // Warranties and guarantees upfront
  wg: {
    name: "warrantiesGuarantees",
    description: "Warranties and guarantees upfront Y/N for SEF25",
    refType: "sef25Ref",
    paths: [
      "/properties/propertyPack/properties/guaranteesWarrantiesAndIndemnityInsurances",
    ],
  },

  // Insurance claims upfront
  ic: {
    name: "insuranceClaims",
    description: "Insurance claims upfront for SEF25",
    refType: "sef25Ref",
    paths: [
      "/properties/propertyPack/properties/insurance",
    ],
  },

  // Neighbour development upfront
  nd: {
    name: "neighbourDevelopment",
    description: "Neighbour development upfront for SEF25",
    refType: "sef25Ref",
    paths: [
      "/properties/propertyPack/properties/notices/properties/neighbourDevelopment",
    ],
  },

  // Other material issue upfront
  mi: {
    name: "otherMaterialIssue",
    description: "Other material issue upfront for SEF25",
    refType: "sef25Ref",
    paths: [
      "/properties/propertyPack/properties/additionalInformation/properties/otherMaterialIssue",
    ],
  },

  // Title restrictions for freehold
  tr: {
    name: "titleRestrictions",
    description: "Title restrictions for freehold properties",
    refType: "sef25Ref",
    paths: [
      "/properties/propertyPack/properties/ownership/properties/ownershipsToBeTransferred/items/oneOf/0/properties/titleRestrictions",
    ],
  },

  // Alterations and changes
  ac: {
    name: "alterationsAndChanges",
    description: "Selected alterations and changes fields for SEF25",
    refType: "sef25Ref",
    preserveDiscriminators: true,
    paths: [
      "/properties/propertyPack/properties/alterationsAndChanges/properties/extension/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/extension/oneOf/1/properties/details",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/extension/oneOf/1/properties/planningPermission/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/extension/oneOf/1/properties/buildingRegApproval/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/loftConversion/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/loftConversion/oneOf/1/properties/details",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/loftConversion/oneOf/1/properties/planningPermission/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/loftConversion/oneOf/1/properties/buildingRegApproval/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/garageConversion/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/garageConversion/oneOf/1/properties/details",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/garageConversion/oneOf/1/properties/planningPermission/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/garageConversion/oneOf/1/properties/buildingRegApproval/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/removalOfInternalWalls/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/removalOfInternalWalls/oneOf/1/properties/details",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/removalOfInternalWalls/oneOf/1/properties/planningPermission/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/removalOfInternalWalls/oneOf/1/properties/buildingRegApproval/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/changeOfUse/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/changeOfUse/oneOf/1/properties/details",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/changeOfUse/oneOf/1/properties/planningPermission/properties/yesNo",
      "/properties/propertyPack/properties/alterationsAndChanges/properties/changeOfUse/oneOf/1/properties/buildingRegApproval/properties/yesNo",
    ],
  },

  // TA6 edition 6 compatibility for shared MI/NTS validation
  ta: {
    name: "ta6Ed6Compatibility",
    description:
      "Compatibility enum ranges for validating shared PDTF state containing TA6 edition 6 answers",
    refType: "ta6ed6CompatRef",
    paths: [
      "/properties/propertyPack/properties/parking",
      "/properties/propertyPack/properties/heating",
      "/properties/propertyPack/properties/rightsAndInformalArrangements",
      "/properties/propertyPack/properties/legalBoundaries",
    ],
  },
};

// Function to extract properties at specific paths with given ref type
function extractPathsWithRef(
  schema,
  paths,
  refConfig,
  preserveDiscriminators = false
) {
  const result = {};

  paths.forEach((path) => {
    try {
      const value = jp.get(schema, path);
      if (value && hasRef(value, refConfig)) {
        // Set the value at the same path in result
        jp.set(result, path, extractRefProperties(value, refConfig));
        if (preserveDiscriminators) {
          addAncestorDiscriminators(result, schema, path);
        }
      }
    } catch (err) {
      console.warn(`Path not found: ${path}`);
    }
  });

  return result;
}

function addAncestorDiscriminators(result, schema, path) {
  const parts = path.split("/").filter(Boolean);

  for (let index = 1; index <= parts.length; index += 1) {
    const ancestorPath = `/${parts.slice(0, index).join("/")}`;

    try {
      const schemaNode = jp.get(schema, ancestorPath);
      if (!schemaNode?.discriminator) continue;

      const resultNode = jp.get(result, ancestorPath);
      if (resultNode && typeof resultNode === "object") {
        resultNode.discriminator = schemaNode.discriminator;
      }
    } catch (err) {
      // Ancestor was not materialised by this selected path.
    }
  }
}

// Check if an object or its descendants have the specified ref
function hasRef(obj, refConfig) {
  let found = false;
  traverse(obj).forEach(function (element) {
    if (element && element[refConfig.ref]) {
      found = true;
      this.stop();
    }
  });
  return found;
}

// Extract only ref-specific properties
function extractRefProperties(obj, refConfig, parentKey) {
  const result = {};

  // Copy ref-specific metadata at current level
  if (obj[refConfig.ref]) result[refConfig.outputRef] = obj[refConfig.ref];
  if (obj[refConfig.required]) result.required = obj[refConfig.required];
  if (obj[refConfig.title]) result.title = obj[refConfig.title];
  if (obj[refConfig.description]) result.description = obj[refConfig.description];
  if (obj[refConfig.enumKey]) result.enum = obj[refConfig.enumKey];

  // Handle discriminator
  if (obj.discriminator) {
    result.discriminator = obj.discriminator;
  }

  // Recursively process properties
  if (obj.properties) {
    result.properties = {};
    Object.keys(obj.properties).forEach((key) => {
      const prop = obj.properties[key];
      if (hasRef(prop, refConfig)) {
        result.properties[key] = extractRefProperties(prop, refConfig, key);
      }
    });
    // Only keep properties if we found some with ref
    if (Object.keys(result.properties).length === 0) {
      delete result.properties;
    }
  }

  // Handle arrays
  if (obj.items) {
    if (hasRef(obj.items, refConfig)) {
      result.items = extractRefProperties(obj.items, refConfig);
    }
  }

  // Handle oneOf
  if (obj.oneOf) {
    // Always preserve the full array structure and order
    const processedOneOf = obj.oneOf.map((schema, index) => {
      if (hasRef(schema, refConfig)) {
        const extracted = extractRefProperties(schema, refConfig);
        // For oneOf schemas, we need to preserve discriminator enum values
        if (obj.discriminator && schema.properties) {
          const propName = obj.discriminator.propertyName;
          if (schema.properties[propName]) {
            if (!extracted.properties) extracted.properties = {};
            extracted.properties[propName] = {
              enum:
                schema.properties[propName][refConfig.enumKey] ||
                schema.properties[propName].enum,
            };
          }
        }
        // Also preserve base enum values for all other properties in the extension
        if (schema.properties) {
          if (!extracted.properties) extracted.properties = {};
          Object.keys(schema.properties).forEach((propName) => {
            const prop = schema.properties[propName];
            if (prop.enum) {
              if (!extracted.properties[propName]) {
                extracted.properties[propName] = {
                  enum: prop.enum,
                };
              } else if (!extracted.properties[propName].enum) {
                // If the property exists but doesn't have enum, add it
                extracted.properties[propName].enum = prop.enum;
              }
            }
          });
        }
        return extracted;
      } else {
        // If this branch doesn't have ref, preserve the base discriminator enum
        if (obj.discriminator && schema.properties) {
          const propName = obj.discriminator.propertyName;
          if (schema.properties[propName]) {
            return {
              properties: {
                [propName]: {
                  enum: schema.properties[propName].enum,
                },
              },
            };
          }
        }
        // If no discriminator, return empty object to preserve structure
        return {};
      }
    });
    result.oneOf = processedOneOf;

    // --- NEW: If this is an extension property inside a oneOf, promote it to the parent overlay ---
    // If parentKey is set, and this object has extension metadata, return a stub for the parent
    if (
      parentKey &&
      (result[refConfig.outputRef] || result.required || result.discriminator)
    ) {
      // This is an extension property inside a oneOf branch
      // Return a stub for the parent property with metadata and oneOf structure
      const parentStub = {};
      Object.assign(parentStub, result);
      return parentStub;
    }
  }

  // Copy other JSON Schema keywords that might be present
  [
    "type",
    "format",
    "minimum",
    "maximum",
    "minLength",
    "maxLength",
    "minItems",
    "maxItems",
  ].forEach((keyword) => {
    if (obj[keyword] !== undefined) {
      result[keyword] = obj[keyword];
    }
  });

  return result;
}

// Add required array at parent levels if needed
function addRequiredArrays(overlay, schema, refConfig) {
  traverse(overlay).forEach(function (node) {
    if (node && node.properties) {
      const schemaPath = "/" + this.path.join("/");
      try {
        const schemaNode = jp.get(schema, schemaPath);
        if (schemaNode && schemaNode[refConfig.required]) {
          // Filter to only include properties that exist in this overlay
          const overlayProps = Object.keys(node.properties);
          const requiredProps = schemaNode[refConfig.required].filter((prop) =>
            overlayProps.includes(prop)
          );
          if (requiredProps.length > 0) {
            node.required = requiredProps;
          }
        }
      } catch (err) {
        // Path doesn't exist in schema, skip
      }
    }
  });
  return overlay;
}

// Annotate intermediate nodes with refs from the source schema
// This ensures every level of the overlay tree carries an ntsRef
function addIntermediateRefs(overlay, schema, refConfig) {
  traverse(overlay).forEach(function (node) {
    if (node && typeof node === "object" && !Array.isArray(node) && node.properties) {
      // Skip if this node already has a ref
      if (node[refConfig.outputRef]) return;

      const schemaPath = "/" + this.path.join("/");
      try {
        const schemaNode = jp.get(schema, schemaPath);
        if (!schemaNode) return;
        // When the output key differs from the source key (e.g. sef25Ref -> ntsRef),
        // prefer the schema's existing outputRef on intermediate parents so we
        // don't clobber legitimate NTS refs when the extension is later merged.
        if (
          refConfig.ref !== refConfig.outputRef &&
          schemaNode[refConfig.outputRef]
        ) {
          node[refConfig.outputRef] = schemaNode[refConfig.outputRef];
        } else if (schemaNode[refConfig.ref]) {
          node[refConfig.outputRef] = schemaNode[refConfig.ref];
        }
      } catch (err) {
        // Path doesn't exist in schema, skip
      }
    }
  });
  return overlay;
}

// Generate extension overlays
Object.entries(extensionMappings).forEach(([code, config]) => {
  const refType = config.refType || "nts2Ref";
  const refConfig = getRefConfig(refType);

  console.log(`\nGenerating extension overlay: ${code} (${config.name}) [${refType}]`);

  // Extract the specific paths
  let overlay = extractPathsWithRef(
    combinedSchema,
    config.paths,
    refConfig,
    config.preserveDiscriminators
  );

  // Add required arrays where needed
  overlay = addRequiredArrays(overlay, combinedSchema, refConfig);

  // Add refs to intermediate nodes in the path hierarchy
  overlay = addIntermediateRefs(overlay, combinedSchema, refConfig);

  // Add schema metadata
  overlay.$schema = "http://json-schema.org/draft-07/schema#";
  overlay.$id = `https://trust.propdata.org.uk/schemas/v3/overlays/extensions/${code}.json`;
  overlay.$comment = config.description;

  // Write the overlay file
  const fileName = path.join(
    __dirname,
    `../schemas/v3/overlays/extensions/${code}.json`
  );
  fs.writeFileSync(fileName, JSON.stringify(overlay, null, 2));
  console.log(`Extension overlay ${code} written to ${fileName}`);
});

console.log("\nExtension overlay extraction complete!");
