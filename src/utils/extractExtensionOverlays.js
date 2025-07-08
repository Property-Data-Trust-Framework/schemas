const traverse = require("traverse");
const jp = require("jsonpointer");
const fs = require("fs");
const path = require("path");

const combinedSchema = require("../schemas/v3/combined.json");

// Define the extension overlay mappings
const extensionMappings = {
  // Outside areas
  oa: {
    name: "outsideAreas",
    description: "Outside areas extension for NTS",
    paths: ["/properties/propertyPack/properties/residentialPropertyFeatures/properties/outsideAreas"]
  },
  
  // Estate rentcharges for freehold
  er: {
    name: "estateRentcharges",
    description: "Estate rentcharges for freehold properties",
    paths: ["/properties/propertyPack/properties/ownership/properties/ownershipsToBeTransferred/items/oneOf/0/properties/estateRentcharges"]
  },
  
  // Managing agent contact details for leasehold
  ma: {
    name: "managingAgent",
    description: "Managing agent contact details for leasehold",
    paths: ["/properties/propertyPack/properties/ownership/properties/ownershipsToBeTransferred/items/oneOf/2/properties/leaseholdInformation/properties/contactDetails"]
  },
  
  // Transfer fees for leasehold
  tf: {
    name: "transferFees",
    description: "Transfer fees for leasehold",
    paths: ["/properties/propertyPack/properties/ownership/properties/ownershipsToBeTransferred/items/oneOf/2/properties/leaseholdInformation/properties/serviceCharge/oneOf/1/properties/transferFees"]
  },
  
  // Main construction type if standard
  mc: {
    name: "mainConstruction",
    description: "Main construction type if standard form",
    paths: ["/properties/propertyPack/properties/typeOfConstruction/properties/isStandardForm/oneOf/0/properties/constructionType"]
  },
  
  // Loft access and details
  la: {
    name: "loftAccess",
    description: "Loft access and details",
    paths: ["/properties/propertyPack/properties/typeOfConstruction/properties/loft"]
  },
  
  // Spray foam insulation
  sf: {
    name: "sprayFoam",
    description: "Spray foam insulation",
    paths: ["/properties/propertyPack/properties/typeOfConstruction/properties/sprayFoamInsulation"]
  },
  
  // Specialist issues - dry rot
  dr: {
    name: "dryRot",
    description: "Dry rot treatment specialist issue",
    paths: ["/properties/propertyPack/properties/specialistIssues/properties/dryRotEtcTreatment"]
  },
  
  // Specialist issues - asbestos
  as: {
    name: "asbestos",
    description: "Asbestos specialist issue",
    paths: ["/properties/propertyPack/properties/specialistIssues/properties/containsAsbestos"]
  },
  
  // Specialist issues - Japanese knotweed
  jk: {
    name: "japaneseKnotweed",
    description: "Japanese knotweed specialist issue",
    paths: ["/properties/propertyPack/properties/specialistIssues/properties/japaneseKnotweed"]
  },
  
  // Specialist issues - subsidence
  sb: {
    name: "subsidence",
    description: "Subsidence or structural fault specialist issue",
    paths: ["/properties/propertyPack/properties/specialistIssues/properties/subsidenceOrStructuralFault"]
  },
  
  // Specialist issues - health and safety
  hs: {
    name: "healthSafety",
    description: "Health and safety specialist issue",
    paths: ["/properties/propertyPack/properties/specialistIssues/properties/ongoingHealthOrSafetyIssue"]
  },
  
  // Solar panels leased
  sl: {
    name: "solarPanelsLeased",
    description: "Solar panels ownership details",
    paths: ["/properties/propertyPack/properties/electricity/properties/solarPanels/oneOf/1/properties/panelsOwnedOutright"]
  },
  
  // Heating installation date
  hi: {
    name: "heatingInstalled",
    description: "Central heating installation date",
    paths: ["/properties/propertyPack/properties/heating/properties/heatingSystem/oneOf/1/properties/centralHeatingDetails/properties/centralHeatingInstalled"]
  },
  
  // Flood defences
  fd: {
    name: "floodDefences",
    description: "Flood defence information",
    paths: ["/properties/propertyPack/properties/environmentalIssues/properties/flooding/properties/floodDefences"]
  },
  
  // Other property in chain
  oc: {
    name: "otherPropertyChain",
    description: "Other property in chain dependency",
    paths: ["/properties/propertyPack/properties/completionAndMoving/properties/otherPropertyInChain"]
  }
};

// Function to extract properties at specific paths with nts2Ref
function extractPathsWithNts2Ref(schema, paths) {
  const result = {};
  
  paths.forEach(path => {
    try {
      const value = jp.get(schema, path);
      if (value && hasNts2Ref(value)) {
        // Set the value at the same path in result
        jp.set(result, path, extractNts2Properties(value));
      }
    } catch (err) {
      console.warn(`Path not found: ${path}`);
    }
  });
  
  return result;
}

// Check if an object or its descendants have nts2Ref
function hasNts2Ref(obj) {
  let found = false;
  traverse(obj).forEach(function(element) {
    if (element && element.nts2Ref) {
      found = true;
      this.stop();
    }
  });
  return found;
}

// Extract only NTS2-specific properties (with nts2Ref)
function extractNts2Properties(obj) {
  const result = {};
  
  // Copy nts2-specific metadata at current level
  if (obj.nts2Ref) result.ntsRef = obj.nts2Ref;
  if (obj.nts2Required) result.required = obj.nts2Required;
  if (obj.nts2Title) result.title = obj.nts2Title;
  if (obj.nts2Description) result.description = obj.nts2Description;
  if (obj.nts2Enum) result.enum = obj.nts2Enum;
  
  // Handle discriminator
  if (obj.discriminator) {
    result.discriminator = obj.discriminator;
  }
  
  // Recursively process properties
  if (obj.properties) {
    result.properties = {};
    Object.keys(obj.properties).forEach(key => {
      const prop = obj.properties[key];
      if (hasNts2Ref(prop)) {
        result.properties[key] = extractNts2Properties(prop);
      }
    });
    // Only keep properties if we found some with nts2Ref
    if (Object.keys(result.properties).length === 0) {
      delete result.properties;
    }
  }
  
  // Handle arrays
  if (obj.items) {
    if (hasNts2Ref(obj.items)) {
      result.items = extractNts2Properties(obj.items);
    }
  }
  
  // Handle oneOf
  if (obj.oneOf) {
    const processedOneOf = [];
    obj.oneOf.forEach((schema, index) => {
      if (hasNts2Ref(schema)) {
        const extracted = extractNts2Properties(schema);
        // For oneOf schemas, we need to preserve discriminator enum values
        if (obj.discriminator && schema.properties) {
          const propName = obj.discriminator.propertyName;
          if (schema.properties[propName]) {
            if (!extracted.properties) extracted.properties = {};
            extracted.properties[propName] = {
              enum: schema.properties[propName].nts2Enum || schema.properties[propName].enum
            };
          }
        }
        processedOneOf.push(extracted);
      }
    });
    if (processedOneOf.length > 0) {
      result.oneOf = processedOneOf;
    }
  }
  
  // Copy other JSON Schema keywords that might be present
  ['type', 'format', 'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems'].forEach(keyword => {
    if (obj[keyword] !== undefined) {
      result[keyword] = obj[keyword];
    }
  });
  
  return result;
}

// Add required array at parent levels if needed
function addRequiredArrays(overlay, schema) {
  traverse(overlay).forEach(function(node) {
    if (node && node.properties) {
      const schemaPath = "/" + this.path.join("/");
      try {
        const schemaNode = jp.get(schema, schemaPath);
        if (schemaNode && schemaNode.nts2Required) {
          // Filter to only include properties that exist in this overlay
          const overlayProps = Object.keys(node.properties);
          const requiredProps = schemaNode.nts2Required.filter(prop => overlayProps.includes(prop));
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

// Generate extension overlays
Object.entries(extensionMappings).forEach(([code, config]) => {
  console.log(`\nGenerating extension overlay: ${code} (${config.name})`);
  
  // Extract the specific paths
  let overlay = extractPathsWithNts2Ref(combinedSchema, config.paths);
  
  // Add required arrays where needed
  overlay = addRequiredArrays(overlay, combinedSchema);
  
  // Add schema metadata
  overlay.$schema = "http://json-schema.org/draft-07/schema#";
  overlay.$id = `https://trust.propdata.org.uk/schemas/v3/overlays/extensions/${code}.json`;
  overlay.$comment = config.description;
  
  // Write the overlay file
  const fileName = path.join(__dirname, `../schemas/v3/overlays/extensions/${code}.json`);
  fs.writeFileSync(fileName, JSON.stringify(overlay, null, 2));
  console.log(`Extension overlay ${code} written to ${fileName}`);
});


console.log("\nExtension overlay extraction complete!");