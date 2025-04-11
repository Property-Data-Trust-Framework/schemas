const traverse = require("traverse");
const fs = require("fs");

const combinedSchema = require("../schemas/v3/combined.json");

const includeFields = [
  "ntsRef",
  "nts-sefRef",
  "ntslRef",
  "ta6Ref",
  "ta7Ref",
  "ta10Ref",
];

let pathCsv = "";

traverse(combinedSchema).forEach(function (element) {
  let path = "/" + this.path.join("/");
  if (path === "/") path = "";
  if (includeFields.some((field) => element[field]) && element.title) {
    const filteredPath = path
      .split("/")
      .filter(
        (segment) =>
          segment !== "properties" &&
          segment !== "oneOf" &&
          segment !== "items" &&
          isNaN(segment)
      )
      .join("/");
    const line = `"/${filteredPath}", "${element.title}"\n`;
    pathCsv += line;
  }
});

fs.writeFileSync("./pathList.csv", pathCsv);
