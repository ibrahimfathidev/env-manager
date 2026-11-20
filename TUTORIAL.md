# Env Manager — Tutorial

This guide covers running the app and using its main features.

## 1. Start the app

1. Install Python 3 if it is not already installed.
2. Open a terminal in the `env-manager` folder.
3. Run:

   ```bash
   python -m http.server 4173
   ```

4. Visit <http://localhost:4173>.

No `npm install` step is needed to run the web app.

## 2. Load environment variables

You can use either method:

- Click **Import file** and choose a `.env`, `.txt`, or `.json` file.
- Paste dotenv-style lines into the **Source** editor, then click **Parse variables**.

A sample configuration is available through **Load sample**.

## 3. Edit variables

- Change a key or value directly in the Variables table.
- Click **Add variable** to create a new row.
- Use the `×` action to remove a row.
- Use the search field to filter by key or value.
- Click **Reveal** to show values. Click **Mask** to hide them again.
- Use the copy icon to copy one value.

The Source editor is updated after table edits. Parsing Source replaces the current table with the parsed entries.

## 4. Read the validation report

The report checks:

- Key names: letters, numbers, and underscores; the first character must be a letter or underscore.
- Duplicate keys.
- Empty values.
- Common sensitive-looking key names, shown with a small marker.

A sensitive marker is based on the variable name only. It does not scan or judge whether a value is actually secret.

## 5. Export files

- **Export .env** downloads all current values. Treat this file as a secret.
- **Export .env.example** downloads the keys with blank values. This is the recommended template to commit to a public repository.
- **Export JSON** includes all current values and asks for confirmation first.

Never commit a real `.env` file or a JSON export containing secrets.

## 6. Run the tests

With Node.js 18 or newer, run:

```bash
npm test
```

The tests cover parsing, duplicate detection, serialization, JSON conversion, and validation.

## 7. Important privacy notes

The app does not send values to a server and does not persist them in browser storage. The workspace is cleared when you reload or close the page. However, masking is not encryption. Your browser, extensions, clipboard manager, and downloaded files may still expose values. Use a trusted device and never paste production credentials into an untrusted environment.
