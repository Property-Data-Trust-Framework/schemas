const { dereference } = require("@jdw/jst");
const traverse = require("traverse");
const jp = require("jsonpointer");
const fs = require("fs");
const merge = require("deepmerge");

const combinedSchema = require("../schemas/v2/combined.json");

const overlay = "baspiUI";
const keys = [
  "isDependent",
  "component",
  "htmlClass",
  "addButtonLabelFirst",
  "addButtonLabelSubsequent",
];

const returnSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: `https://trust.propdata.org.uk/schemas/v2/overlays/${overlay}.json`,
};

traverse(combinedSchema).forEach(function (element) {
  let path = "/" + this.path.join("/");
  if (path === "/") path = "";
  if (keys.includes(this.key)) {
    jp.set(returnSchema, path, element);
  }
});

const fileName = `../schemas/v2/overlays/${overlay}.json`;
fs.writeFileSync(fileName, JSON.stringify(returnSchema, null, 2));
console.log(`Overlay ${overlay} written to ${overlay}`);

traverse(combinedSchema).forEach(function (element) {
  if (keys.includes(this.key)) {
    this.delete(true); // true = stop here
  }
});

fs.writeFileSync(
  "../schemas/v2/combined.json",
  JSON.stringify(combinedSchema, null, 2)
);
