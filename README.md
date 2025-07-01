# PDTF Schemas

[![npm version](https://badge.fury.io/js/%40pdtf%2Fschemas.svg)](https://badge.fury.io/js/%40pdtf%2Fschemas)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The Property Data Trust Framework (PDTF) Schemas provide standardized JSON Schema definitions for digital residential property data exchange in England and Wales. This package enables frictionless property data exchange between software products and services while maintaining trusted information about data provenance.

## Project Goals & Status

**Current Version:** 3.4.0 (Schema v3 - Stable)

This schema framework aims to support the [Home Buying and Selling Group](https://homebuyingandsellinggroup.co.uk) 'Property Pack' initiative, encompassing all requirements starting with the Buyers and Sellers Property Information set ([BASPI v4.0](https://homebuyingandsellinggroup.co.uk/baspi/)).

**Key Objectives:**
- 🏠 **Standardize** residential property data exchange across England and Wales
- 🔗 **Enable** frictionless data sharing between software products and services  
- 🛡️ **Maintain** trusted information about data provenance and verification
- 📋 **Support** industry-standard forms (BASPI, NTS, Law Society TA forms)
- 🧩 **Provide** modular components for flexible implementation

**Related Projects:**
- [API Specifications](https://github.com/Property-Data-Trust-Framework/api) - OpenAPI specs for data exchange protocols
- [PDTF Website](https://trust.propdata.org.uk) - Official framework documentation

This repository is a living document, with schemas evolving as framework requirements are refined and extended. Semantic versioning ensures backward compatibility while enabling schema evolution.

## Quick Start

### Installation

```bash
npm install @pdtf/schemas
```

### Basic Usage

```javascript
const { getTransactionSchema, getValidator } = require('@pdtf/schemas');

// Get a schema with BASPI v5 overlay
const schema = getTransactionSchema(
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
  ["baspiV5"]
);

// Create a validator
const validator = getValidator(
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json", 
  ["baspiV5"]
);

// Validate data
const isValid = validator(propertyData);
if (!isValid) {
  console.log('Validation errors:', validator.errors);
}
```

## Features

- **🏗️ Modular Schema System** - Base schemas with flexible overlay composition
- **📋 Multiple Form Support** - BASPI, NTS, Law Society TA forms, and more
- **🧩 Extension Overlays** - Granular NTS2 features as individual modules
- **✅ JSON Schema Validation** - Full JSON Schema Draft 07 support with AJV
- **🔗 Verified Claims** - Support for verified data provenance tracking
- **📚 Comprehensive Documentation** - Detailed usage guides and examples

## Package Structure

```
@pdtf/schemas/
├── src/
│   ├── schemas/
│   │   ├── v3/                    # Current schema version
│   │   │   ├── pdtf-transaction.json    # Base transaction schema
│   │   │   ├── overlays/               # Form-specific overlays
│   │   │   │   ├── baspi5.json        # BASPI v5 overlay
│   │   │   │   ├── nts.json           # National Trading Standards
│   │   │   │   ├── ta6.json           # Law Society forms
│   │   │   │   └── extensions/        # Modular NTS2 extensions
│   │   │   │       ├── jk.json        # Japanese Knotweed
│   │   │   │       ├── tf.json        # Transfer Fees
│   │   │   │       └── ...            # 16 total extensions
│   │   │   └── combined.json          # Master schema for generation
│   │   ├── v2/                        # Legacy schema version
│   │   ├── verifiedClaims/            # Verified claims schemas
│   │   └── examples/                  # Example data files
│   ├── tests/                         # Jest test suite
│   └── utils/                         # Build and extraction tools
├── index.js                          # Main API entry point
└── package.json
```

## Core Concepts

### Base Schema + Overlays

PDTF uses a **base transaction schema** combined with **overlays** to create form-specific schemas:

- **Base Schema**: Core property transaction structure
- **Overlays**: Form-specific fields, references, and validation rules
- **Extensions**: Modular components for selective feature adoption

### Schema Versions

- **v3** (Current): Full feature set with extension support
- **v2** (Legacy): Maintained for backward compatibility

## API Reference

### Core Functions

#### `getTransactionSchema(schemaId, overlays)`

Creates a merged schema from base schema and overlays.

```javascript
const schema = getTransactionSchema(
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
  ["baspiV5", "ta6ed4"]
);
```

**Parameters:**
- `schemaId` (string): Schema version URL
- `overlays` (array): Array of overlay names or objects

#### `getValidator(schemaId, overlays)`

Returns an AJV validator function for the specified schema combination.

```javascript
const validator = getValidator(schemaId, ["baspiV5"]);
const isValid = validator(data);
```

#### `validateVerifiedClaims(claims, schemaId, overlays)`

Validates verified claims against schema paths.

```javascript
const errors = validateVerifiedClaims(verifiedClaims, schemaId, ["nts2023"]);
```

### Available Overlays

#### Main Form Overlays

| Overlay | Description | Version |
|---------|-------------|---------|
| `baspiV4` | Buyers and Sellers Property Information | v4.0 |
| `baspiV5` | Buyers and Sellers Property Information | v5.0 |
| `nts2023` | National Trading Standards | 2023 |
| `nts2025` | National Trading Standards | 2025 |
| `ta6ed4` | Law Society Property Information Form | Edition 4 |
| `ta7ed3` | Law Society Leasehold Information Form | Edition 3 |
| `ta10ed3` | Law Society Fittings and Contents Form | Edition 3 |

[View all overlays →](src/schemas/v3/overlays/README.md)

#### Extension Overlays

Modular NTS2 features for selective adoption:

```javascript
// Individual extensions
const schema = getTransactionSchema(schemaId, ["nts2023", "jk", "tf"]);

// Multiple specialist issues
const schema = getTransactionSchema(schemaId, ["nts2023", "as", "dr", "jk", "sb"]);
```

| Extension | Code | Description |
|-----------|------|-------------|
| Japanese Knotweed | `jk` | Knotweed presence and management |
| Transfer Fees | `tf` | Additional leasehold fees |
| Managing Agent | `ma` | Leasehold managing agent details |
| Solar Panels | `sl` | Solar panel ownership details |
| Asbestos | `as` | Asbestos presence and management |

[View all extensions →](src/schemas/v3/overlays/README.md#extension-overlays)

## Usage Examples

### Form-Specific Schemas

```javascript
// BASPI v5 for estate agents
const baspiSchema = getTransactionSchema(schemaId, ["baspiV5"]);

// Law Society conveyancing forms
const legalSchema = getTransactionSchema(schemaId, ["ta6ed4", "ta7ed3"]);

// National Trading Standards compliance
const ntsSchema = getTransactionSchema(schemaId, ["nts2023"]);
```

### Modular NTS2 Features

```javascript
// Selective NTS2 adoption
const partialNts2 = getTransactionSchema(schemaId, [
  "nts2023",        // Base NTS
  "jk",             // Japanese Knotweed
  "tf",             // Transfer Fees  
  "ma"              // Managing Agent
]);

// Full specialist issues
const specialistIssues = getTransactionSchema(schemaId, [
  "nts2023", "as", "dr", "jk", "sb", "hs"
]);
```

### Data Validation

```javascript
const { getValidator } = require('@pdtf/schemas');

const validator = getValidator(schemaId, ["baspiV5"]);

const propertyData = {
  propertyPack: {
    priceInformation: {
      price: 350000,
      priceQualifier: "Freehold"
    },
    // ... more property data
  }
};

if (validator(propertyData)) {
  console.log('✅ Data is valid');
} else {
  console.log('❌ Validation errors:', validator.errors);
}
```

### Verified Claims & Data Provenance

PDTF supports verified claims to maintain data provenance and trust throughout property transactions. Claims package specific property data with verification evidence, enabling traceability back to authoritative sources.

```javascript
const { validateVerifiedClaims } = require('@pdtf/schemas');

// Current verified claims format
const verifiedClaims = [{
  id: "claim-12345",
  transactionId: "txn-67890", 
  schemaVersion: "3.4.0",
  verification: {
    trust_framework: "uk_pdtf",
    time: "2024-07-01T10:30:00Z",
    evidence: [{
      type: "vouch",
      attestation: {
        type: "digital_attestation",
        voucher: { name: "Estate Agent Ltd" }
      },
      verification_method: { type: "auth" }
    }]
  },
  claims: {
    "/propertyPack/priceInformation/price": 350000,
    "/propertyPack/energyEfficiency/epcRating": "C"
  }
}];

// Validate claims against schema
const errors = validateVerifiedClaims(verifiedClaims, schemaId, ["baspiV5"]);
if (errors.length === 0) {
  console.log('✅ Verified claims are valid');
}
```

**Key Features:**
- **Schema Path Validation** - Claims reference specific schema paths (e.g., `/propertyPack/priceInformation/price`)
- **Provenance Tracking** - Each claim includes verification evidence and source attribution
- **Trust Framework Integration** - Claims operate within the UK PDTF trust framework
- **Attachment Support** - Supporting documents can be cryptographically linked to claims

**Roadmap - W3C Verifiable Credentials:**
The next version of the PDTF framework will migrate to [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/) to provide:
- **Enhanced Security** - Cryptographically signed claims with tamper detection
- **Granular Permissions** - Fine-grained access control over claim data
- **Interoperability** - Standards-based approach for broader ecosystem compatibility
- **Selective Disclosure** - Share only necessary claim data for each transaction context

## Development

### Building Schemas

Schemas are generated from a master `combined.json` file:

```bash
# Extract overlays and base schema
node src/utils/extractOverlay.js

# Generate extension overlays
node src/utils/extractExtensionOverlays.js
```

### Testing

```bash
# Run all tests
npm test

# Test specific functionality
npm test -- --testPathPattern=extensionOverlays
npm test -- --testPathPattern=transactionSchema
```


## Versioning

The schema follows semantic versioning:
- **Patch** (3.4.x): Bug fixes, no breaking changes
- **Minor** (3.x.0): New fields, backward compatible
- **Major** (x.0.0): Breaking changes, migration required

## Licensing

Licensed under the [MIT License](https://opensource.org/licenses/MIT). 

**Important:** Overlays contain fields from licensed forms ([BASPI](https://homebuyingsellingcouncil.co.uk/wp-content/uploads/2021/03/Terms-of-Licence-mandatory-download-for-use-of-BASPI.pdf), [PIQ](https://www.propertymark.co.uk/static/14e7c154-98de-4230-957f09bd8d5ddeec/f542b10a-7710-4c37-b3958ccaeec25d4b/property-information-questionnaire-residential-sales.pdf), [Law Society TA](https://www.lawsociety.org.uk/topics/property/transaction-forms)). When rendering data into these forms, ensure compliance with their respective license terms.

## Support

- 📖 [Overlay Documentation](src/schemas/v3/overlays/README.md)
- 📁 [Example Files](src/examples/)
- 🐛 [Issue Tracker](https://github.com/Property-Data-Trust-Framework/schemas/issues)
- 🌐 [PDTF Website](https://trust.propdata.org.uk)

