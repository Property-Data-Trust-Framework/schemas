# PDTF Schema Overlays

This directory contains overlay schemas that extend the base PDTF transaction schema with form-specific properties and requirements. Overlays use a merging system that allows flexible composition of schema features.

## Overview

The PDTF schema system uses a base transaction schema (`pdtf-transaction.json`) combined with overlays to create form-specific schemas. Each overlay contains:

- Form-specific references (e.g., `ntsRef`, `baspiRef`)
- Additional required fields
- Form-specific titles and descriptions
- Enhanced validation rules

## Main Form Overlays

### Property Information Forms

| Overlay | Description | Form Version | Key Features |
|---------|-------------|--------------|--------------|
| `baspi4.json` | Buyers and Sellers Property Information | v4.0 | Core property transaction data |
| `baspi5.json` | Buyers and Sellers Property Information | v5.0 | Enhanced BASPI with additional fields |
| `nts.json` | National Trading Standards | 2023 | Consumer protection requirements |
| `nts2.json` | National Trading Standards | 2025 | Extended NTS with specialist issues |
| `ntsl.json` | National Trading Standards (Leasehold) | 2023 | Leasehold-specific NTS requirements |
| `ntsl2.json` | National Trading Standards (Leasehold) | 2025 | Enhanced leasehold NTS |
| `piq.json` | Property Information Questionnaire | v3 | Estate agent property information |

### Legal Forms

| Overlay | Description | Form Version | Key Features |
|---------|-------------|--------------|--------------|
| `ta6.json` | Property Information Form | Edition 4 | Law Society standard form |
| `ta7.json` | Leasehold Information Form | Edition 3 | Leasehold-specific legal requirements |
| `ta10.json` | Fittings and Contents Form | Edition 3 | Fixtures and fittings information |

### Search and Survey Forms

| Overlay | Description | Form Version | Key Features |
|---------|-------------|--------------|--------------|
| `con29R.json` | Local Authority Search | 2019 | Standard local authority enquiries |
| `con29DW.json` | Drainage and Water Search | Current | Water authority enquiries |
| `lpe1.json` | Leasehold Property Enquiries | Edition 4 | Additional leasehold enquiries |
| `fme1.json` | Freehold Management Enquiries | Edition 2 | Managed freehold enquiries |
| `llc1.json` | Local Land Charges Search | v2 | Local land charges register |
| `oc1.json` | Optional Enquiries of Local Authority | v21 | Additional local authority enquiries |

### Specialist Forms

| Overlay | Description | Key Features |
|---------|-------------|--------------|
| `rds.json` | Residential Development Survey | Property development information |
| `sr24.json` | Sustainability Report | Environmental sustainability data |

## Extension Overlays

The `extensions/` directory contains modular overlays that add specific NTS2 features to the NTS base. These allow selective adoption of NTS2 enhancements without requiring the full NTS2 overlay.

### Specialist Issues Extensions

| Extension | String Key | Description | Reference | Usage |
|-----------|------------|-------------|-----------|-------|
| `as.json` | `"as"` | Asbestos | A5.2 | Asbestos presence and management |
| `dr.json` | `"dr"` | Dry Rot Treatment | A5.1 | Dry rot and timber treatment |
| `jk.json` | `"jk"` | Japanese Knotweed | A5.3 | Japanese knotweed presence and management |
| `sb.json` | `"sb"` | Subsidence | A5.4 | Subsidence or structural faults |
| `hs.json` | `"hs"` | Health & Safety | A5.5 | Ongoing health or safety issues |

### Property Features Extensions

| Extension | String Key | Description | Reference | Usage |
|-----------|------------|-------------|-----------|-------|
| `oa.json` | `"oa"` | Outside Areas | - | Garden, balcony, communal areas |
| `la.json` | `"la"` | Loft Access | A4.1 | Loft access, boarding, insulation |
| `sf.json` | `"sf"` | Spray Foam Insulation | A4.2 | Spray foam insulation details |
| `mc.json` | `"mc"` | Main Construction | - | Standard construction type |

### Ownership & Financial Extensions

| Extension | String Key | Description | Reference | Usage |
|-----------|------------|-------------|-----------|-------|
| `er.json` | `"er"` | Estate Rentcharges | A3.2 | Freehold estate rentcharges |
| `ma.json` | `"ma"` | Managing Agent | A1.5.4 | Leasehold managing agent details |
| `tf.json` | `"tf"` | Transfer Fees | A3.5.1.1 | Additional leasehold fees |

### Utilities & Services Extensions

| Extension | String Key | Description | Reference | Usage |
|-----------|------------|-------------|-----------|-------|
| `sl.json` | `"sl"` | Solar Panels Ownership | B3.7.1 | Solar panel ownership details |
| `hi.json` | `"hi"` | Heating Installation | B3.4.3.2 | Central heating installation date |
| `fd.json` | `"fd"` | Flood Defences | - | Flood defence information |

### Transaction Extensions

| Extension | String Key | Description | Reference | Usage |
|-----------|------------|-------------|-----------|-------|
| `oc.json` | `"oc"` | Other Property Chain | - | Chain dependency information |

## Usage Examples

### Basic Form Overlay

```javascript
const { getTransactionSchema } = require('@pdtf/schemas');

// Get schema with single overlay
const schema = getTransactionSchema(
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
  ["nts"]
);
```

### Multiple Overlays

```javascript
// Combine multiple form overlays
const schema = getTransactionSchema(
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
  ["baspi5", "ta6", "con29R"]
);
```

### Extension Overlays

```javascript
// Using string keys (recommended)
const schema = getTransactionSchema(
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
  ["nts2023", "jk", "tf"]
);

// Or load extension overlays directly
const jkExtension = require('./overlays/extensions/jk.json');
const tfExtension = require('./overlays/extensions/tf.json');

const schema = getTransactionSchema(
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
  ["nts2023", jkExtension, tfExtension]
);

// Or access via extensionOverlays object
const { extensionOverlays } = require('@pdtf/schemas');
const schema = getTransactionSchema(
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
  ["nts2023", extensionOverlays.jk, extensionOverlays.tf]
);
```

### Custom Overlay Objects

```javascript
// Define custom overlay inline
const customOverlay = {
  properties: {
    propertyPack: {
      properties: {
        customField: {
          ntsRef: "CUSTOM.1",
          type: "string",
          title: "Custom Field"
        }
      }
    }
  }
};

const schema = getTransactionSchema(
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
  ["nts", customOverlay]
);
```

## Overlay Structure

All overlays follow this structure:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://trust.propdata.org.uk/schemas/v3/overlays/{overlay-name}.json",
  "properties": {
    "propertyPack": {
      "{formRef}": "reference-code",
      "required": ["field1", "field2"],
      "properties": {
        "field1": {
          "{formRef}": "reference-code.1",
          "type": "string",
          "title": "Field Title"
        }
      }
    }
  }
}
```

### Reference Attributes

Each overlay uses form-specific reference attributes:

- `ntsRef` / `nts2Ref` - National Trading Standards references
- `baspi4Ref` / `baspi5Ref` - BASPI form references  
- `ta6Ref` / `ta7Ref` / `ta10Ref` - Law Society form references
- `lpe1Ref` / `fme1Ref` - Property enquiry references
- `con29RRef` / `con29DWRef` - Search form references
- `rdsRef` - Residential Development Survey references
- `piqRef` - Property Information Questionnaire references

### Discriminator Support

Overlays support conditional schemas using discriminators:

```json
{
  "yesNoField": {
    "discriminator": {
      "propertyName": "yesNo"
    },
    "oneOf": [
      {
        "properties": {
          "yesNo": { "enum": ["Yes"] },
          "details": { "type": "string" }
        },
        "required": ["details"]
      }
    ]
  }
}
```

## Validation

Use the validation functions to check data against overlay schemas:

```javascript
const { getValidator, validateVerifiedClaims } = require('@pdtf/schemas');

// Get validator for specific overlay combination
const validator = getValidator(
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
  ["nts", "baspi5"]
);

// Validate data
const isValid = validator(data);
if (!isValid) {
  console.log(validator.errors);
}

// Validate verified claims
const errors = validateVerifiedClaims(
  verifiedClaimsData,
  "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
  ["nts"]
);
```

## Best Practices

1. **Choose appropriate overlays** for your use case - don't include unnecessary forms
2. **Test overlay combinations** thoroughly as some may conflict
3. **Use extension overlays** for selective NTS2 adoption
4. **Validate your data** against the merged schema
5. **Keep overlay order consistent** for predictable results
6. **Cache merged schemas** in production for performance

## Schema Evolution

When overlays are updated:

- **Patch versions** (3.4.x) - Bug fixes, no breaking changes
- **Minor versions** (3.x.0) - New fields, backward compatible  
- **Major versions** (x.0.0) - Breaking changes, migration required

Always test your integration when updating overlay versions.

## Testing

Extension overlays are thoroughly tested to ensure:

- **String key compatibility** - All extensions work with simple string keys
- **Merging behavior** - Overlays merge correctly with base schemas  
- **NTS2 equivalence** - Combined extensions produce equivalent results to NTS2
- **Individual functionality** - Each extension adds the expected properties
- **Schema validation** - All generated schemas are valid and functional

Run tests with:
```bash
npm test -- --testPathPattern=extensionOverlays
```

## Support

For questions about overlays:

- Check the [main repository documentation](../../../README.md)
- Review [example files](../../examples/) for usage patterns
- Submit issues to the [GitHub repository](https://github.com/Property-Data-Trust-Framework/schemas)