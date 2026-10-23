# Our family — जीव वंशवृक्ष

A view-only, bilingual family tree designed for senior citizens on phones and for relatives on desktop. It uses plain HTML, CSS, and ES modules—there is no framework, build step, database, or sign-in.

## Run locally

The app fetches `data/family.json`, so it must be served over HTTP:

```sh
npm run serve
```

Then open [http://localhost:8000](http://localhost:8000). Any basic static server or static host works.

## Edit the family

Edit `data/family.json`. The app checks the data before rendering and reports readable errors for duplicate IDs, missing parents, cycles, invalid roots, or unsupported phase-2 relationships. `data/family.schema.json` documents every allowed field.

- Every person except the root needs a `parentId` containing their father's ID.
- `order` controls sibling order; birth year and file order are fallbacks.
- `nameHindi`, years, photo, biography, gender, and spouses are optional.
- Leave `photo` out or set it to `null` to show an initials avatar.
- Keep image paths relative to `index.html`, for example `img/members/ram.webp`.

`data/family.phase2.example.json` demonstrates the future wife-and-daughter extension. The live app continues to load only `family.json`.

## Import the supplied CSV

`family.json` is generated from `Family Tree Database & Interactive Template Data - Family_Tree_Data.csv`. After changing the CSV, run:

```sh
npm run import:data
```

The importer preserves IDs, names, parent links, branch names, life status and notes. Embedded data-URI photos are extracted into `img/members/` and referenced by path so the JSON stays small.

## Sharing and Open Graph

Before publishing, replace the placeholder title/description in `index.html`, provide a raster 1200×630 sharing image if the target service does not accept `img/og-family.svg`, and add the production canonical URL. WhatsApp must be able to reach the public URL and image without authentication.

## Tests

```sh
npm test
```

The tests cover validation, ordering and generations, relationship terms, searching, layout centering, and branch collapse.

## Five-minute elder test

Without explaining the interface, ask someone to identify the oldest ancestor, choose themselves, find their grandfather's brother, return Home, search in Hindi or English, enlarge the text, and open the full-tree outline. Note hesitation, repeated taps, unreadable labels, and any relationship term that causes confusion.
