# SEF25 Extension Overlays — Front-End UI Spec

## Overview

Extension overlays add follow-up questions to existing form sections. Each overlay is loaded by passing its key to `getTransactionSchema(schemaId, overlays)`.

### Pre-existing overlays

These were added before this PR and are already in production.

| Overlay Key | Name | Section | Fields Added |
|-------------|------|---------|-------------|
| `sc` | Supply Costs | Water & Drainage | Cost fields for private water and sewerage (restructured to hasCost Yes/No gate) |
| `pc` | Parking Permit Cost | Parking | 1 frequency field |
| `ph` | Property Hazards | Specialist Issues | 4 Yes/No + details fields |

### New overlays (this PR)

| Overlay Key | Name | Section | Fields Added |
|-------------|------|---------|-------------|
| `dk` | Dropped Kerb | Parking | 1 Yes/No field |
| `rw` | Private Right of Way | Rights & Informal Arrangements | 1 Yes/No + details field |
| `sd` | Storm/Fire/Flood Damage | Environmental Issues | 1 Yes/No + details field |
| `lc` | Solar Lease Costs | Utilities (Solar Panels) | 1 cost field (hasCost + amount + frequency) |
| `wg` | Warranties & Guarantees | Guarantees & Warranties | Marks 7 warranty categories as required |
| `ic` | Insurance Claims | Insurance | Marks insuranceClaims required (isInsured=Yes branch) |
| `nd` | Neighbour Development | Notices | Adds sef25Ref to neighbourDevelopment (already required via NTS) |
| `mi` | Material Issue | Additional Information | Marks otherMaterialIssue required |
| `tr` | Title Restrictions | Ownership (Freehold) | Adds titleRestrictions field to freehold branch |

### Existing fields with sef25Ref only (no separate overlay needed)

| Field | Path | sef25Ref | Notes |
|-------|------|----------|-------|
| `hasBeenFlooded` | `environmentalIssues.flooding.historicalFlooding.hasBeenFlooded` | E1.2 | Already required and rendered via NTS flooding section |

All fields use `sef25Ref` for reference codes.

---

## Pre-existing overlays (detail)

### 1. Supply Costs (`sc`)

#### 1a. Private Water Cost

**Trigger:** Show when `propertyPack.waterAndDrainage.water.mainsWater.yesNo` = `"No"`

**Path:** `propertyPack.waterAndDrainage.water.mainsWater.associatedCost`

**UI:** Render alongside the existing "How is water supplied?" details field. First ask if there are costs, then show amount and frequency if Yes.

| Field | Path (relative) | Type | Validation | UI Element |
|-------|-----------------|------|------------|------------|
| Has costs? | `associatedCost.hasCost` | `string` | Required, enum | Yes/No radio |
| Cost (£) | `associatedCost.amount` | `number` | Required when Yes | Numeric input |
| Payment frequency | `associatedCost.frequency` | `string` | Required when Yes, enum | Dropdown |

**Frequency enum values:** `"Per month"`, `"Per year"`

**Ref:** `U1.1` (hasCost: `U1.1.1`, amount: `U1.1.2`, frequency: `U1.1.3`)

#### 1b. Private Sewerage Cost

**Trigger:** Show when `propertyPack.waterAndDrainage.drainage.mainsFoulDrainage.yesNo` = `"No"` or `"Not known"`

**Path:** `propertyPack.waterAndDrainage.drainage.mainsFoulDrainage.associatedCost`

**UI:** Same hasCost pattern as water cost above.

**Ref:** `U1.2` (hasCost: `U1.2.1`, amount: `U1.2.2`, frequency: `U1.2.3`)

### 2. Parking Permit Cost (`pc`)

**Trigger:** Show when `propertyPack.parking.controlledParking.yesNo` = `"Yes"`

**Path:** `propertyPack.parking.controlledParking.costOfPermitFrequency`

**UI:** Render alongside the existing cost of permit field. The frequency dropdown clarifies whether the cost amount is monthly or annual.

| Field | Path (relative) | Type | Validation | UI Element |
|-------|-----------------|------|------------|------------|
| Payment frequency | `costOfPermitFrequency` | `string` | Enum | Dropdown |

**Frequency enum values:** `"Per month"`, `"Per year"`

**Ref:** `P1.1`

### 3. Property Hazards (`ph`)

**Trigger:** Always shown (standalone questions within Specialist Issues).

**Path prefix:** `propertyPack.specialistIssues`

All 4 fields follow the same pattern: Yes/No, if Yes show required details.

| Property | Title | sef25Ref |
|----------|-------|----------|
| `wellsDitchesShaft` | Are there any wells, ditches, or shafts at the property? | H1.1 |
| `damagedOrExposedElectrics` | Are there any damaged or exposed electrics at the property? | H1.2 |
| `damageToFlooringOrStaircases` | Is there any damage to flooring and/or staircases? | H1.3 |
| `knownAreasInPoorCondition` | Are there any known areas in poor condition (internal or external)? | H1.4 |

---

## New overlays (detail)

### 4. Dropped Kerb (`dk`)

**Trigger:** Always shown within Parking section.

**Path:** `propertyPack.parking.droppedKerbAccess`

| Field | Path (relative) | Type | Validation | UI Element |
|-------|-----------------|------|------------|------------|
| Dropped kerb? | `droppedKerbAccess.yesNo` | `string` | Required, enum | Yes/No radio |

**Ref:** `K1.1` (yesNo: `K1.1.1`)

---

### 5. Private Right of Way (`rw`)

**Trigger:** Always shown within Rights & Informal Arrangements, alongside the existing public right of way question.

**Path:** `propertyPack.rightsAndInformalArrangements.rightsOrArrangements.privateRightOfWay`

**UI:** Same pattern as `publicRightOfWay` — Yes/No, if Yes show details.

| Field | Path (relative) | Type | Validation | UI Element |
|-------|-----------------|------|------------|------------|
| Private ROW? | `privateRightOfWay.yesNo` | `string` | Required, enum | Yes/No radio |
| Details | `privateRightOfWay.details` | `string` | Required when Yes, minLength 1 | Text input |

**Ref:** `R1.1` (yesNo: `R1.1.1`, details: `R1.1.2`)

---

### 6. Storm, Fire or Flood Damage (`sd`)

**Trigger:** Always shown within Environmental Issues section.

**Path:** `propertyPack.environmentalIssues.stormFireFloodDamage`

| Field | Path (relative) | Type | Validation | UI Element |
|-------|-----------------|------|------------|------------|
| Damage? | `stormFireFloodDamage.yesNo` | `string` | Required, enum | Yes/No radio |
| Details | `stormFireFloodDamage.details` | `string` | Required when Yes, minLength 1 | Text area |

**Ref:** `E1.1` (yesNo: `E1.1.1`, details: `E1.1.2`)

---

### 7. Solar Panel Lease Costs (`lc`)

**Trigger:** Show when `propertyPack.electricity.solarPanels.panelsOwnedOutright.yesNo` = `"No"` (panels are leased).

**Path:** `propertyPack.electricity.solarPanels.panelsOwnedOutright.associatedCost`

**UI:** Render alongside existing lease details. First ask if there are costs, then show amount and frequency if Yes.

| Field | Path (relative) | Type | Validation | UI Element |
|-------|-----------------|------|------------|------------|
| Has costs? | `associatedCost.hasCost` | `string` | Required, enum | Yes/No radio |
| Amount (£) | `associatedCost.amount` | `number` | Required when Yes | Numeric input |
| Frequency | `associatedCost.frequency` | `string` | Required when Yes, enum | Dropdown |

**Frequency enum values:** `"Per month"`, `"Per year"`

**Ref:** `S1.1` (hasCost: `S1.1.1`, amount: `S1.1.2`, frequency: `S1.1.3`)

---

### 8. Warranties & Guarantees Upfront (`wg`)

**Trigger:** Always shown when overlay is loaded. Displayed upfront regardless of `hasValidGuaranteesOrWarranties` value.

**Path prefix:** `propertyPack.guaranteesWarrantiesAndIndemnityInsurances`

**UI:** For SEF25 upfront, show all 7 warranty categories as simple Yes/No questions. No details or "Years Remaining" needed at this stage — the law firm picks up details later.

| Property | Title | sef25Ref |
|----------|-------|----------|
| `newHomeWarranty` | New Home Warranty (NHBC or similar) | W1.1 |
| `roofingWork` | Roofing work | W1.2 |
| `dampProofingTreatment` | Damp proofing treatment | W1.3 |
| `centralHeatingAndorPlumbing` | Central heating and/or plumbing | W1.4 |
| `electricalRepairOrInstallation` | Electrical repair or installation | W1.5 |
| `subsidenceWork` | Underpinning or other preventative work / remedial action relating to subsidence | W1.6 |
| `otherGuarantees` | Other Guarantees or warranties | W1.7 |

**Note:** These fields already exist in the base schema under the `hasValidGuaranteesOrWarranties = "Yes"` branch. The `wg` overlay marks them as required within that branch. The Moverly app shows them upfront for SEF25 users without requiring the parent gate question first.

---

### 9. Insurance Claims (`ic`)

**Path:** `propertyPack.insurance.insuranceClaims` (inside `isInsured = "Yes"` branch)

**Ref:** `I1.1` (yesNo: `I1.1.1`) — "Have you made any buildings insurance claims?"

**Note:** The overlay marks insuranceClaims required within the `isInsured = "Yes"` oneOf branch.

---

### 10. Neighbour Development (`nd`)

**Path:** `propertyPack.notices.neighbourDevelopment`

**Ref:** `N1.1` — "Is the seller aware of any proposals to develop property or land nearby?"

**Note:** `neighbourDevelopment` is already required via `ntsRequired` at the notices level. The `nd` overlay adds `sef25Ref` and `ntsRef` annotations so the field is identifiable as SEF25-relevant.

---

### 11. Material Issue (`mi`)

**Path:** `propertyPack.additionalInformation.otherMaterialIssue`

**Ref:** `M1.1` (yesNo: `M1.1.1`) — "Are you aware of any other material issue or information which may affect the average person's decision to proceed?"

---

### 12. Title Restrictions (`tr`)

**Path:** `propertyPack.ownership.ownershipsToBeTransferred[Freehold].titleRestrictions`

**Ref:** `T1.1` (yesNo: `T1.1.1`, details: `T1.1.2`) — "Are there any known restrictions on the title?"

New field on the freehold ownership branch, modelled on `leaseRestrictions` for leasehold. Yes/No + details if Yes.

---

## Loading the Extensions

```js
import { getTransactionSchema, getValidator } from "@pdtf/schemas";

const schemaId = "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json";

// Load all SEF25 extensions
const sef25Extensions = ["sc", "pc", "ph", "dk", "rw", "sd", "lc", "wg", "ic", "nd", "mi", "tr"];
const schema = getTransactionSchema(schemaId, sef25Extensions);

// Or combine with other overlays
const schema = getTransactionSchema(schemaId, ["baspiV5", ...sef25Extensions]);

// Validate data against the merged schema
const validator = getValidator(schemaId, sef25Extensions);
```

---

## Summary of Trigger Conditions

| Field | Visible when... |
|-------|----------------|
| Water cost | `mainsWater.yesNo` = `"No"` |
| Sewerage cost | `mainsFoulDrainage.yesNo` = `"No"` or `"Not known"` |
| Parking permit frequency | `controlledParking.yesNo` = `"Yes"` |
| Wells/ditches/shaft | Always (within Specialist Issues) |
| Damaged electrics | Always (within Specialist Issues) |
| Flooring/staircase damage | Always (within Specialist Issues) |
| Areas in poor condition | Always (within Specialist Issues) |
| Dropped kerb access | Always (within Parking) |
| Private right of way | Always (within Rights & Informal Arrangements) |
| Storm/fire/flood damage | Always (within Environmental Issues) |
| Solar panel lease costs | `panelsOwnedOutright.yesNo` = `"No"` |
| Warranty categories (7) | Always when `wg` overlay loaded (within Guarantees & Warranties) |
| Insurance claims | `isInsured.yesNo` = `"Yes"` (via `ic` overlay) |
| Neighbour development | Always (via `nd` overlay) |
| Other material issue | Always (via `mi` overlay) |
| Title restrictions | Always (via `tr` overlay, freehold only) |

---

## Moverly propertyPackTasks Changes

The following changes are needed in the Moverly app's `propertyPackTasks` configuration to surface the new SEF25 fields in the listing journey.

### Existing tasks to deprecate

The flooding and planning tasks should be stepped up to their parent section level to cover the new sibling fields (`stormFireFloodDamage` and `neighbourDevelopment`).

```js
// Replace existing flooding task with deprecated version
{
  name: "Flooding",
  path: "/propertyPack/environmentalIssues/flooding",
  category: "listing",
  overlay: "nts2023",
  deprecated: true, // replaced by environmental issues check
},

// Replace existing planning task with deprecated version
{
  name: "Planning and development",
  path: "/propertyPack/notices/planningApplication",
  category: "listing",
  overlay: "nts2023",
  deprecated: true, // replaced by notices check
},
```

### New listing tasks to add

```js
{
  name: "Environmental issues",
  checkName: "sef25-environmentalIssues",
  path: "/propertyPack/environmentalIssues",
  category: "listing",
  overlay: "sd",
},
{
  name: "Notices",
  checkName: "sef25-notices",
  path: "/propertyPack/notices",
  category: "listing",
  overlay: "nd",
},
{
  name: "Guarantees & warranties",
  checkName: "sef25-warranties",
  path: "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances",
  category: "listing",
  overlay: "wg",
},
{
  name: "Insurance claims",
  checkName: "sef25-insurance",
  path: "/propertyPack/insurance",
  category: "listing",
  overlay: "ic",
},
{
  name: "Additional material information",
  checkName: "sef25-additionalInformation",
  path: "/propertyPack/additionalInformation",
  category: "listing",
  overlay: "mi",
},
```

### Fields covered by existing listing tasks (no new task needed)

| Extension | Covered by |
|-----------|------------|
| `dk` (dropped kerb) | Parking |
| `rw` (private right of way) | Rights and easements |
| `lc` (solar lease costs) | Electricity |
| `sc` (supply costs) | Water and drainage |
| `pc` (parking permit cost) | Parking |
| `ph` (property hazards) | Specialist issues |
| `tr` (title restrictions) | Ownership |
