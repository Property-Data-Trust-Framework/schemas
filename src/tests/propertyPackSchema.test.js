import jp from "jsonpointer";

import {
  propertyPackSchema,
  validator,
  getSubschema,
  getSubschemaValidator
} from "../index.js";
import examplePropertyPack from "./examplePropertyPack.json";

test("exports a property pack schema", () => {
  expect(propertyPackSchema).not.toBeNull();
});

test("sample is valid", () => {
  const isValid = validator(examplePropertyPack);
  expect(isValid).toBe(true);
});

test("invalid sample is invalid", () => {
  const clonedExamplePropertyPack = JSON.parse(
    JSON.stringify(examplePropertyPack)
  );
  delete clonedExamplePropertyPack.propertyPack.materialFacts.notices;
  const isValid = validator(clonedExamplePropertyPack);
  expect(isValid).toBe(false);
});

test("correctly gets a subschema", () => {
  const subschema = getSubschema("/propertyPack/materialFacts/notices");
  expect(subschema.title).toBe("Notices which Affect the Property");
});

test("correctly gets a working subschema validator", () => {
  const path = "/propertyPack/materialFacts/notices";
  const validator = getSubschemaValidator(path);
  const data = jp.get(examplePropertyPack, path);
  expect(data.neighbourDevelopment.yesNo).toBe("No");
  let isValid = validator(data);
  expect(isValid).toBe(true);
  data.neighbourDevelopment.yesNo = "Invalid string";
  isValid = validator(data);
  expect(isValid).toBe(false);
});
