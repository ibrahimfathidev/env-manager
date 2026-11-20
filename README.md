# Env Manager

A small, local-first browser tool for editing, validating, and exporting `.env` files. It has no backend and no third-party runtime dependencies.

## Features

- Import `.env`, `.txt`, or flat `.json` files.
- Parse dotenv-style `KEY=value` lines, comments, and `export KEY=value` entries.
- Edit, add, delete, search, and copy variables.
- Mask values by default and reveal them on demand.
- Validate key names, find duplicate keys, and flag empty values.
- Highlight key names that look sensitive, such as `API_KEY`, `TOKEN`, or `PASSWORD`.
- Export `.env`, a values-free `.env.example`, or JSON.
- Process content in the browser without saving it to browser storage.

## Run locally

You only need Python 3 or another static file server. From this folder run:

```bash
python -m http.server 4173
```

Open <http://localhost:4173> in your browser.

You can also open `index.html` directly in many browsers, but a local server is recommended for consistent ES module support.

## Tests

Node.js 18 or newer is required:

```bash
npm test
```

## Privacy and security

- The app makes no API calls and has no server component.
- Imported content is held in page memory only; it is not written to `localStorage` or `sessionStorage`.
- Values are masked in the table by default. Masking is only a display aid, not encryption.
- `.env` and JSON exports contain real values. Keep them private and out of public repositories.
- `.env.example` exports keys with blank values, so it is safer to commit as a starter template.
- Browser extensions, the device, clipboard history, and downloaded files are outside this app's control. Avoid entering production secrets on shared or untrusted devices.

## Supported syntax

The parser supports blank lines, full-line comments, `export KEY=value`, single-line quoted values, escaped characters in double-quoted values, and whitespace-prefixed inline comments. It is a lightweight helper, not a complete implementation of every dotenv dialect. Multiline quoted values and shell interpolation are not supported.

## Project structure

```text
env-manager/
├── index.html
├── styles.css
├── app.js
├── env-core.js
├── tests/
│   └── env-core.test.js
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── TUTORIAL.md
```

## License

MIT. See `LICENSE`.
