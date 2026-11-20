// Core .env parsing and export helpers. No browser APIs are used here.

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SENSITIVE_PATTERN = /(SECRET|TOKEN|PASSWORD|PASSWD|API[_-]?KEY|PRIVATE|CREDENTIAL|AUTH|DATABASE_URL|DSN)/i;

function decodeDoubleQuoted(value) {
  return value.replace(/\\([\\"nrt])/g, (_, code) => {
    const escapes = { "\\": "\\", '"': '"', n: "\n", r: "\r", t: "\t" };
    return escapes[code];
  });
}

function readValue(rawValue) {
  const value = rawValue.trim();
  const quote = value[0];

  if (quote === '"' || quote === "'") {
    let closingIndex = -1;
    let escaped = false;

    for (let index = 1; index < value.length; index += 1) {
      const char = value[index];
      if (quote === '"' && char === "\\" && !escaped) {
        escaped = true;
        continue;
      }
      if (char === quote && !escaped) {
        closingIndex = index;
        break;
      }
      escaped = false;
    }

    if (closingIndex === -1) {
      return { value: value.slice(1), error: "Unclosed quoted value" };
    }

    const trailing = value.slice(closingIndex + 1).trim();
    if (trailing && !trailing.startsWith("#")) {
      return { value: value.slice(1, closingIndex), error: "Unexpected text after quoted value" };
    }

    const content = value.slice(1, closingIndex);
    return { value: quote === '"' ? decodeDoubleQuoted(content) : content, error: null };
  }

  // An inline comment starts at a # preceded by whitespace.
  return { value: value.replace(/\s+#.*$/, "").trimEnd(), error: null };
}

/** Parse dotenv-style lines and retain duplicate entries for inspection. */
export function parseEnv(source) {
  const entries = [];
  const diagnostics = [];
  const lines = String(source ?? "").replace(/^\uFEFF/, "").split(/\r?\n/);

  lines.forEach((originalLine, index) => {
    const lineNumber = index + 1;
    const line = originalLine.trim();
    if (!line || line.startsWith("#")) return;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      diagnostics.push({ type: "error", line: lineNumber, message: "Expected KEY=value format" });
      return;
    }

    const key = match[1];
    const parsed = readValue(match[2]);
    entries.push({ key, value: parsed.value });

    if (parsed.error) {
      diagnostics.push({ type: "error", line: lineNumber, message: `${key}: ${parsed.error}` });
    }
  });

  diagnostics.push(...validateEntries(entries));
  return { entries, diagnostics };
}

/** Validate names, duplicates, and values in the current variable list. */
export function validateEntries(entries) {
  const diagnostics = [];
  const firstSeen = new Map();

  entries.forEach((entry, index) => {
    const key = String(entry.key ?? "");
    if (!KEY_PATTERN.test(key)) {
      diagnostics.push({ type: "error", line: null, message: `Variable ${index + 1}: "${key}" is not a valid key` });
    }
    if (firstSeen.has(key)) {
      diagnostics.push({ type: "error", line: null, message: `Duplicate key "${key}"` });
    } else {
      firstSeen.set(key, index);
    }
    if (String(entry.value ?? "") === "") {
      diagnostics.push({ type: "warning", line: null, message: `${key || `Variable ${index + 1}`} has an empty value` });
    }
  });

  return diagnostics;
}

/** Mark common secret-like variable names without inspecting their contents. */
export function isSensitiveKey(key) {
  return SENSITIVE_PATTERN.test(String(key ?? ""));
}

function needsQuotes(value) {
  return value !== value.trim() || /\n|\r|#|"/.test(value);
}

function encodeValue(value) {
  const text = String(value ?? "");
  if (!needsQuotes(text)) return text;
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}"`;
}

/** Serialize variables into a dotenv-compatible string. */
export function serializeEnv(entries) {
  return entries.map(({ key, value }) => `${key}=${encodeValue(value)}`).join("\n");
}

/** Create a safe starter file containing keys but no original values. */
export function serializeExample(entries) {
  const uniqueKeys = [...new Set(entries.map((entry) => String(entry.key ?? "")).filter(Boolean))];
  return ["# Copy this file to .env and add your local values.", ...uniqueKeys.map((key) => `${key}=`)].join("\n");
}

/** Convert flat environment variables into a JSON object. */
export function entriesToJson(entries) {
  return entries.reduce((result, entry) => {
    result[entry.key] = String(entry.value ?? "");
    return result;
  }, {});
}

/** Convert a JSON object into environment variables. */
export function jsonToEntries(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON must contain an object at the top level.");
  }

  return Object.entries(parsed).map(([key, value]) => ({
    key,
    value: value !== null && typeof value === "object" ? JSON.stringify(value) : String(value ?? ""),
  }));
}

export function countLines(text) {
  return text ? String(text).split(/\r?\n/).length : 0;
}
