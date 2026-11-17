## README

### About verified claims
`pdtf-verified-claims.json` describes the schema container in which we store property `claims` and their corresponding `verification`.

This schema structure is strongly influenced by OpenID Connect for Identity Assurance 1.0's way of storing "verified claims".

More Details from the OIDC page which describes the details the nature of `verification` and `claims` objects: https://openid.net/specs/openid-connect-4-identity-assurance-1_0.html#name-representing-verified-claim

### Terms of Use
The schema supports an optional `terms_of_use` object to control access to verified claims based on confidentiality levels:

* **Public**: No access restrictions (`allowed_roles: []`)
* **Restricted**: Requires some participant role but not specifically defined (`allowed_roles: []`)
* **Confidential**: Specific roles defined for access control (e.g., `allowed_roles: ["Seller's Conveyancer", "Buyer's Conveyancer"]`)

The `allowed_roles` array accepts any of the participant roles defined in [pdtf-transaction.json](../v3/pdtf-transaction.json).

Notes:
* For PDTF Schema, all data included in the `claims` object must adhere to [pdtf-transaction.json (v3)](../v3/pdtf-transaction.json)
* For verification, there is more freedom in terms of the type of data that can currently be provided, see the documentation in the OIDC link above for details and examples.
