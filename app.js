import {
  countLines,
  entriesToJson,
  isSensitiveKey,
  jsonToEntries,
  parseEnv,
  serializeEnv,
  serializeExample,
  validateEntries,
} from "./env-core.js";

const $ = (selector) => document.querySelector(selector);
const sourceEditor = $("#source-editor");
const rows = $("#variable-rows");
const diagnosticsBox = $("#diagnostics");
const searchInput = $("#search-input");
const fileInput = $("#file-input");
let entries = [];
let showValues = false;
let sourceDiagnostics = [];
let toastTimer;

const sampleText = `# Example environment configuration\nAPP_NAME=Env Manager\nAPP_ENV=development\nAPP_PORT=3000\nAPI_BASE_URL=https://api.example.com\nAPI_KEY=replace_me\nDB_HOST=127.0.0.1\nDB_PASSWORD=change_me\nLOG_LEVEL=debug`;

function notify(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function downloadFile(name, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(value, successMessage = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = value;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.append(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }
  notify(successMessage);
}

function getDiagnostics() {
  return validateEntries(entries);
}

function renderDiagnostics() {
  const current = [...sourceDiagnostics, ...getDiagnostics()];
  const unique = new Map();
  current.forEach((item) => unique.set(`${item.type}:${item.message}`, item));
  const list = [...unique.values()];
  const errors = list.filter((item) => item.type === "error").length;
  const warnings = list.filter((item) => item.type === "warning").length;
  const sensitive = entries.filter((entry) => isSensitiveKey(entry.key)).length;

  $("#stat-total").textContent = String(entries.length);
  $("#stat-valid").textContent = String(entries.filter((entry) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(entry.key)).length);
  $("#stat-issues").textContent = String(errors);
  $("#stat-sensitive").textContent = String(sensitive);
  $("#report-status").textContent = errors ? `${errors} issue${errors === 1 ? "" : "s"} found` : warnings ? `${warnings} warning${warnings === 1 ? "" : "s"}` : "No issues found";

  if (!list.length) {
    diagnosticsBox.innerHTML = '<div class="diagnostic-empty"><span>✓</span> No validation issues found.</div>';
    return;
  }

  diagnosticsBox.replaceChildren();
  list.forEach((item) => {
    const badge = document.createElement("div");
    badge.className = `diagnostic ${item.type}`;
    const icon = document.createElement("strong");
    icon.textContent = item.type === "error" ? "!" : item.type === "warning" ? "△" : "i";
    const message = document.createElement("span");
    message.textContent = `${item.line ? `Line ${item.line}: ` : ""}${item.message}`;
    badge.append(icon, message);
    diagnosticsBox.append(badge);
  });
}

function updateCounts() {
  $("#line-count").textContent = `${countLines(sourceEditor.value)} lines`;
}

function syncSource() {
  sourceDiagnostics = [];
  sourceEditor.value = serializeEnv(entries);
  updateCounts();
}

function createInput(value, className, type = "text", label = "") {
  const input = document.createElement("input");
  input.className = `variable-input ${className}`;
  input.type = type;
  input.value = value;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", label);
  return input;
}

function renderRows() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = entries.map((entry, index) => ({ entry, index })).filter(({ entry }) =>
    `${entry.key} ${entry.value}`.toLowerCase().includes(query),
  );
  rows.replaceChildren();

  if (!visible.length) {
    const tr = document.createElement("tr");
    tr.className = "empty-row";
    const td = document.createElement("td");
    td.colSpan = 3;
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const glyph = document.createElement("span");
    glyph.className = "empty-glyph";
    glyph.textContent = query ? "⌕" : "{ }";
    const title = document.createElement("strong");
    title.textContent = query ? "No matches" : "No variables yet";
    const note = document.createElement("span");
    note.textContent = query ? "Try a different search term." : "Import a .env file or paste content into the source editor.";
    empty.append(glyph, title, note);
    td.append(empty);
    tr.append(td);
    rows.append(tr);
  } else {
    visible.forEach(({ entry, index }) => {
      const tr = document.createElement("tr");
      const keyCell = document.createElement("td");
      const valueCell = document.createElement("td");
      valueCell.className = "value-cell";
      const actionCell = document.createElement("td");
      const keyInput = createInput(entry.key, "key-input", "text", `Variable ${index + 1} key`);
      const valueInput = createInput(entry.value, "value-input", showValues ? "text" : "password", `${entry.key} value`);
      keyInput.dataset.index = String(index);
      valueInput.dataset.index = String(index);
      keyInput.classList.toggle("invalid", !/^[A-Za-z_][A-Za-z0-9_]*$/.test(entry.key));
      if (isSensitiveKey(entry.key)) {
        const marker = document.createElement("span");
        marker.className = "sensitive-mark";
        marker.title = "This key name looks sensitive";
        keyCell.append(keyInput, marker);
      } else {
        keyCell.append(keyInput);
      }
      valueCell.append(valueInput);

      const actions = document.createElement("div");
      actions.className = "row-actions";
      const copyButton = document.createElement("button");
      copyButton.className = "row-action";
      copyButton.type = "button";
      copyButton.textContent = "⧉";
      copyButton.title = "Copy value";
      copyButton.dataset.action = "copy";
      copyButton.dataset.index = String(index);
      const deleteButton = document.createElement("button");
      deleteButton.className = "row-action delete";
      deleteButton.type = "button";
      deleteButton.textContent = "×";
      deleteButton.title = "Delete variable";
      deleteButton.dataset.action = "delete";
      deleteButton.dataset.index = String(index);
      actions.append(copyButton, deleteButton);
      actionCell.append(actions);
      tr.append(keyCell, valueCell, actionCell);
      rows.append(tr);
    });
  }

  $("#visible-count").textContent = `Showing ${visible.length} of ${entries.length} variables`;
  renderDiagnostics();
}

function parseSource() {
  const result = parseEnv(sourceEditor.value);
  entries = result.entries;
  sourceDiagnostics = result.diagnostics.filter((item) => item.line !== null);
  renderRows();
  notify(`Parsed ${entries.length} variable${entries.length === 1 ? "" : "s"}`);
}

function updateEntryFromInput(input) {
  const index = Number(input.dataset.index);
  if (!Number.isInteger(index) || !entries[index]) return;
  if (input.classList.contains("key-input")) entries[index].key = input.value.trim();
  else entries[index].value = input.value;
}

$("#parse-button").addEventListener("click", parseSource);
sourceEditor.addEventListener("input", updateCounts);
$("#import-button").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".json")) {
      entries = jsonToEntries(text);
      syncSource();
      renderRows();
      notify(`Imported ${file.name}`);
    } else {
      sourceEditor.value = text;
      updateCounts();
      parseSource();
    }
  } catch (error) {
    notify(`Could not import file: ${error.message}`);
  }
  fileInput.value = "";
});

$("#sample-button").addEventListener("click", () => {
  sourceEditor.value = sampleText;
  updateCounts();
  parseSource();
});

$("#clear-button").addEventListener("click", () => {
  if (entries.length || sourceEditor.value) {
    const confirmed = window.confirm("Clear the editor and all parsed variables? This cannot be undone.");
    if (!confirmed) return;
  }
  sourceEditor.value = "";
  entries = [];
  searchInput.value = "";
  showValues = false;
  $("#toggle-label").textContent = "Reveal";
  $("#toggle-values").setAttribute("aria-pressed", "false");
  updateCounts();
  renderRows();
  notify("Workspace cleared");
});

$("#add-button").addEventListener("click", () => {
  let number = entries.length + 1;
  let key = `NEW_VARIABLE_${number}`;
  while (entries.some((entry) => entry.key === key)) {
    number += 1;
    key = `NEW_VARIABLE_${number}`;
  }
  entries.push({ key, value: "" });
  syncSource();
  renderRows();
  const lastInput = rows.querySelector("tr:last-child .key-input");
  lastInput?.focus();
  lastInput?.select();
});

$("#toggle-values").addEventListener("click", () => {
  showValues = !showValues;
  $("#toggle-label").textContent = showValues ? "Mask" : "Reveal";
  $("#toggle-values").setAttribute("aria-pressed", String(showValues));
  renderRows();
});

searchInput.addEventListener("input", renderRows);
rows.addEventListener("input", (event) => {
  if (event.target.matches(".variable-input")) updateEntryFromInput(event.target);
});
rows.addEventListener("change", (event) => {
  if (!event.target.matches(".variable-input")) return;
  updateEntryFromInput(event.target);
  syncSource();
  renderRows();
});
rows.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const index = Number(button.dataset.index);
  if (!entries[index]) return;
  if (button.dataset.action === "copy") {
    await copyText(entries[index].value, `Copied ${entries[index].key}`);
  } else if (button.dataset.action === "delete") {
    entries.splice(index, 1);
    syncSource();
    renderRows();
    notify("Variable removed");
  }
});

$("#export-env").addEventListener("click", () => {
  if (!entries.length) return notify("Add or import variables first");
  downloadFile(".env", serializeEnv(entries));
  notify("Downloaded .env");
});

$("#export-example").addEventListener("click", () => {
  if (!entries.length) return notify("Add or import variables first");
  downloadFile(".env.example", serializeExample(entries));
  notify("Downloaded safe .env.example");
});

$("#export-json").addEventListener("click", () => {
  if (!entries.length) return notify("Add or import variables first");
  const confirmed = window.confirm("JSON export includes the actual values of your variables. Only save or share it if that is safe. Continue?");
  if (!confirmed) return;
  downloadFile("env-variables.json", JSON.stringify(entriesToJson(entries), null, 2), "application/json;charset=utf-8");
  notify("Downloaded JSON");
});

// Start with an empty workspace; no values are stored between sessions.
updateCounts();
renderRows();
