import test from "node:test";
import assert from "node:assert/strict";
import {
  countLines,
  entriesToJson,
  isSensitiveKey,
  jsonToEntries,
  parseEnv,
  serializeEnv,
  serializeExample,
  validateEntries,
} from "../env-core.js";

test("parses comments, export prefixes, and quoted values", () => {
  const result = parseEnv('# comment\nexport APP_NAME="My App"\nTOKEN=abc # note\nEMPTY=');
  assert.deepEqual(result.entries, [
    { key: "APP_NAME", value: "My App" },
    { key: "TOKEN", value: "abc" },
    { key: "EMPTY", value: "" },
  ]);
});

test("reports invalid lines and duplicate keys", () => {
  const result = parseEnv("OK=value\nnot a variable\nOK=again");
  assert.ok(result.diagnostics.some((item) => item.message.includes("Expected KEY=value")));
  assert.ok(result.diagnostics.some((item) => item.message.includes("Duplicate key")));
});

test("round-trips special characters and whitespace", () => {
  const original = [
    { key: "PLAIN", value: "hello" },
    { key: "SPACE", value: "hello world" },
    { key: "HASH", value: "value # tag" },
    { key: "MULTI", value: "first\nsecond" },
  ];
  const parsed = parseEnv(serializeEnv(original));
  assert.deepEqual(parsed.entries, original);
});

test("creates an example file without values", () => {
  assert.equal(
    serializeExample([{ key: "API_KEY", value: "do-not-share" }, { key: "APP_ENV", value: "production" }]),
    "# Copy this file to .env and add your local values.\nAPI_KEY=\nAPP_ENV=",
  );
});

test("converts flat JSON values to environment entries", () => {
  const entries = jsonToEntries('{"PORT":3000,"ACTIVE":true,"CONFIG":{"mode":"dev"}}');
  assert.deepEqual(entries, [
    { key: "PORT", value: "3000" },
    { key: "ACTIVE", value: "true" },
    { key: "CONFIG", value: '{"mode":"dev"}' },
  ]);
  assert.deepEqual(entriesToJson(entries), { PORT: "3000", ACTIVE: "true", CONFIG: '{"mode":"dev"}' });
});

test("detects sensitive-looking names and invalid keys", () => {
  assert.equal(isSensitiveKey("PAYMENT_API_KEY"), true);
  assert.equal(isSensitiveKey("APP_ENV"), false);
  assert.ok(validateEntries([{ key: "not-valid", value: "x" }]).some((item) => item.type === "error"));
});

test("counts lines", () => {
  assert.equal(countLines("A=1\nB=2"), 2);
  assert.equal(countLines(""), 0);
});
