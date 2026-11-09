# AGENTS.md — AI Context & System Architecture

This file provides comprehensive context for AI assistants and automated coding agents working on the **Family Tree (जीव वंशवृक्ष)** codebase. Reading this file provides full context on the application's architecture, data models, domain rules, conventions, and workflows without requiring a full repository scan.

---

## 1. Project Overview & Philosophy

**Family Tree (जीव वंशवृक्ष)** is a lightweight, view-only, bilingual (English & Hindi) interactive family tree web application designed specifically for:
1. **Elderly relatives on smartphones** (large tap targets, readable bilingual typography, high contrast, clean hierarchical list navigation, and a personal "Choose Me" perspective mode).
2. **Family members on desktop** (interactive pan/zoom canvas, botanical styling, SVG minimap, lineage tracing, branch collapsing, and PNG/PDF export).

### Core Architectural Principles
- **Zero build steps & zero bundlers**: Runs directly in any modern browser via native ES Modules (`<script type="module">`).
- **Zero runtime dependencies**: No React, Vue, jQuery, or third-party runtime libraries. Pure Vanilla JavaScript DOM APIs.
- **Zero backend / database**: Completely static client-side application. Data is read from static JSON (`data/family.json`).
- **Zero test dependencies**: Uses Node.js's built-in test runner (`node --test`) and built-in assertion library (`node:assert/strict`).
- **Strictly bilingual**: Full parity between English and Hindi across all user-facing labels, relations, and search queries.

---

## 2. Quick Reference & Commands

| Task | Command | Description |
|---|---|---|
| **Run local server** | `npm run serve` | Runs `python3 -m http.server 8000` (must serve over HTTP; `file://` fails due to `fetch()` CORS). |
| **Run test suite** | `npm test` | Runs `node --test tests/*.test.js` using Node's native test runner. |
| **Import CSV data** | `npm run import:data` | Executes `scripts/import-family-csv.mjs` to convert CSV into `data/family.json` and extract member portraits. |
| **Local URL** | `http://localhost:8000` | Open in browser once server is running. |

---

## 3. Directory Map & File Responsibilities

```
FamilyTree/
├── index.html                   # HTML entry point: header, layout shells, settings menu, ARIA live region
├── admin.html                   # Admin portal: login gate, member manager, photo upload, backup download
├── vercel.json                  # Vercel deployment & rewrite configuration (/admin -> admin.html)
├── package.json                 # Project configuration (scripts & @vercel/blob for serverless functions)
├── README.md                    # Human-facing introduction & testing instructions
├── AGENTS.md                    # AI context document (this file)
│
├── api/                         # Vercel Serverless Functions (ESM)
│   ├── _utils.js                # Shared auth tokens, HMAC verification, JSON body parser
│   ├── auth.js                  # Admin authentication & session verification
│   ├── family.js                # Serves live family.json from Vercel Blob (fallback to data/family.json)
│   ├── upload.js                # Uploads member portraits directly to Vercel Blob
│   ├── members.js               # Validates and writes updated family.json to Vercel Blob
│   └── transliterate.js         # Transliterates English names to Hindi Devanagari in real-time
│
├── css/                         # Modular CSS stylesheets (breakpoint: 900px)
│   ├── tokens.css               # Design tokens: palette (greens, golds, parchment), font scales, transitions
│   ├── base.css                 # CSS reset, font declarations, skip links, base accessibility
│   ├── components.css           # UI components: person cards, avatar markups, buttons, dialogs, badges
│   ├── admin.css                # Admin portal styling: login card, explorer sidebar, editor form
│   ├── mobile.css               # Mobile layout (<900px): home hero, list sections, viewer picker, search
│   ├── desktop.css              # Desktop layout (>=900px): botanical masthead, canvas stage, toolbar, minimap, sidebar
│   └── print.css                # Print & PDF export layout rules
│
├── data/                        # Static data storage and schemas
│   ├── family.json              # Active family data loaded by the app
│   ├── family.schema.json       # JSON Schema (Draft 2020-12) validating family.json structure
│   └── family.phase2.example.json # Reference schema showing planned future extensions (daughters' lines/spouses)
│
├── js/                          # Vanilla ES Modules (Native ESM)
│   ├── app.js                   # Application coordinator: bootstrap, media queries, routing, preferences
│   ├── admin.js                 # Admin coordinator: session auth, member CRUD, canvas image compression, Vercel Blob sync
│   ├── data.js                  # Fetches data/family.json with error handling; invokes validation
│   ├── validate.js              # Strict data validation: integrity, cycle detection, paternal rules
│   ├── tree.js                  # Hierarchical tree builder, generation calculator, search indexing, lineage traversal
│   ├── layout.js                # Mathematical canvas layout engine (bottom-up measure, top-down centering)
│   ├── relations.js             # Kinship relationship derivation engine (bilingual: uncles, bua, cousins, etc.)
│   ├── i18n.js                  # Internationalization dictionary (en & hi), honorific stripping, date formatting
│   ├── preferences.js           # LocalStorage state management: locale, textSize, contrast, viewerId
│   ├── router.js                # Hash router (#/home, #/person/:id, #/search, #/tree)
│   ├── components.js            # HTML component generators (initials, photoMarkup, personCard, link bindings)
│   ├── mobile-view.js           # Mobile page renderers (Home, Person detail, Search, Full tree outline)
│   ├── desktop-view.js          # Desktop interactive view (Pan/zoom stage, minimap, side detail inspector)
│   └── export.js                # Canvas PNG exporter using SVG foreignObject snapshotting
│
├── scripts/
│   └── import-family-csv.mjs    # CSV-to-JSON importer script; extracts base64 photos to img/members/
│
├── tests/                       # Unit tests executed via `node --test`
│   ├── fixtures.js              # Test data fixtures (phaseOne mock family tree)
│   ├── validation.test.js       # Data integrity, duplicate IDs, missing parents, cycle checks
│   ├── tree.test.js             # Hierarchy, generation depth, sibling ordering, bilingual search
│   ├── layout.test.js           # Parent-child horizontal centering, branch collapsing
│   ├── relations.test.js        # Relative relationship terms (uncles, cousins, direct lineage)
│   └── i18n.test.js             # Date formatting, honorific stripping, script handling
│
├── img/                         # SVG icons, botanical ornaments, UI branding
│   ├── members/                 # Extracted or uploaded member portrait images
│   ├── logo.png                 # Main crest / logo
│   ├── botanical-corner.svg     # Decorative corner borders for desktop masthead
│   ├── memorial-garland.png     # Garland overlay for deceased members
│   └── tree-emblem.svg          # Central tree icon
└── fonts/                       # Local font assets (optional)
```

---

## 4. Data Model & Domain Rules

### `data/family.json` Structure
```json
{
  "family": {
    "title": "Jeev family",
    "titleHindi": "जीव वंशवृक्ष",
    "rootId": "p1"
  },
  "members": [
    {
      "id": "p1",
      "name": "Shri Jeev",
      "nameHindi": "श्री जीव",
      "gender": "M",
      "parentId": null,
      "order": 1,
      "dob": "1910",
      "dod": "1985",
      "isDeceased": true,
      "branch": "Main Branch",
      "photo": "img/members/p1.jpg",
      "bio": "Founding ancestor.",
      "spouses": [
        {
          "name": "Shrimati Sita",
          "nameHindi": "श्रीमती सीता",
          "dob": "1915",
          "dod": "1990"
        }
      ]
    }
  ]
}
```

### Critical Domain Constraints & Invariants (enforced by `validate.js`)
1. **Paternal Tree (Phase 1)**:
   - Exactly **one root member** (`parentId: null`), matching `family.rootId`.
   - The root member **must be male** (`gender: "M"`).
   - Every non-root member must specify a valid `parentId` corresponding to an existing male member (`gender: "M"`). Female members (`gender: "F"`) cannot be parents in Phase 1.
   - Female members cannot have spouses in Phase 1 (`gender === "F" && spouses.length` is rejected).
2. **Cycle & Uniqueness Rules**:
   - `id` must be unique across all members.
   - No self-parenting (`member.parentId !== member.id`).
   - Ancestry graph must be an acyclic tree (cycles are validated and rejected).
3. **Ordering & Determinism**:
   - Sibling sorting rule in `tree.js`:
     1. `order` ascending (positive integer).
     2. Fallback to `birthYear` ascending.
     3. Fallback to original JSON index `_index` ascending.
4. **Dates & Deceased Status**:
   - Full dates (e.g. `"YYYY-MM-DD"`, `"DD/MM/YYYY"`, `"15 May 1913"`) or year-only values (`"1913"` or `1913`) are supported for `dob` (Date of Birth) and `dod` (Date of Death) on members and spouses.
   - When exact date/month are unknown, 4-digit year strings or numbers are used (e.g. `"1913"` or `1913`). Completely unknown dates are `null`.
   - Valid years are 4 digits (between 1000 and 2200). `dod` cannot precede `dob`.
   - A member is treated as deceased if `isDeceased: true` OR `dod` / `deathYear` is present.
   - Legacy `birthYear` and `deathYear` properties remain supported and are automatically normalized.

---

## 5. Architectural Systems & Data Flow

### 1. Bootstrapping Flow (`js/app.js`)
1. `loadPreferences()` loads persisted settings from `localStorage`.
2. `applyPreferences()` writes tokens to document root: `lang`, `data-text-size` (`compact` | `default` | `large`), and `data-contrast` (`normal` | `high`).
3. `loadFamily()` fetches `data/family.json` and runs `validateFamily()`.
4. `buildTree()` creates bidirectional graph: computes `member.children`, `member.depth`, `member.ancestors`, and `tree.generations`.
5. `applyCopy()` populates localized DOM text and header statistics.
6. Responsive check via `matchMedia('(min-width: 900px)')`:
   - If `>= 900px`: Instantiates or refreshes `createDesktop()`.
   - If `< 900px`: Invokes `renderMobile()` based on hash route.

### 2. Hash Routing (`js/router.js`)
- `#/home` -> Mobile Home: root ancestor hero card, stats, "Choose Me" picker, and children list.
- `#/person/:id` -> Person View: detailed profile, dates, bio, immediate family lists (father, brothers, sisters, sons, daughters).
- `#/search` -> Search view: bilingual real-time filter across members and branches.
- `#/search?mode=viewer` -> Perspective picker: allows user to select who they are to compute personalized kinship terms.
- `#/tree` -> Mobile full tree: collapsible generational outline accordion.

### 3. Desktop Canvas & Toolbar (`js/desktop-view.js`)
- **Fullscreen Distraction-Free View**: Toggled from the top right button (`#fullscreen-toggle`) or via the `Escape` key. Removes header, masthead, toolbar, and detail drawer, expanding the tree canvas to 100% viewport while keeping only the tree and bottom-left SVG minimap.
- **Real-Time Interactive Search**: Floating autocomplete dropdown under the search input displaying candidate members, generational depth, and branch tags; selecting a member auto-expands collapsed branches, unhides deeper generations, smoothly centers the node, and keeps the pulsating `is-search-hit` highlight.
- **Generation Filter**: Allows scoping the tree to Generation 1 (root only) or through Generation 1–N with automatic re-centering and canvas fitting.
- **Zoom & View Navigation**: Multiplicative zoom in/out (0.1× to 2.5×), true screen-bounding `fit()`, and `reset()` centering directly on the root ancestor.

### 4. Layout Calculation (`js/layout.js`)
- Constant dimensions: `CARD_WIDTH = 272`, `CARD_HEIGHT = 396`, `H_GAP = 42`, `V_GAP = 116`, `TREE_TOP = 118`.
- **Pass 1 (Bottom-up)**: `measure()` computes the required horizontal width of every subtree recursively.
- **Pass 2 (Top-down)**: `place()` positions each parent centered above the bounding span of its children:
  $$\text{parentX} = \text{childLeft} + \frac{\text{subtreeWidth} - \text{CARD\_WIDTH}}{2}$$
- Produces SVG connector paths (`from` and `to` coordinates) with vertical midpoint elbows and decorative leaf markers.

### 4. Kinship Derivation Engine (`js/relations.js`)
Calculates the relationship of any target `personId` relative to `viewerId` (defaults to root if no viewer is selected):
- Direct: `self`, `father`, `son`, `daughter`, `grandfather`, `grandson`, `granddaughter`.
- Siblings: `brother`, `sister`.
- Paternal Uncles & Aunts:
  - Elder paternal uncle: **Taau / ताऊ** (if uncle is older than viewer's father by birth year or order).
  - Younger paternal uncle: **Chacha / चाचा** (if uncle is younger than viewer's father).
  - Paternal aunt: **Bua / बुआ**.
- Cousins: **Cousin brother / चचेरे भाई**, **Cousin sister / चचेरी बहन**.
- Ancestors / Descendants / General Relatives.

### 5. Internationalization & Text Sanitization (`js/i18n.js`)
- All UI strings live in `COPY.en` and `COPY.hi`.
- `displayName(person, locale)`: returns Hindi name if in Hindi mode, falling back to English.
- `alternateName(person, locale)`: displays Hindi name under English name when in English mode; suppressed in Hindi mode.
- `parentRelation(person, parent, locale)`: strips honorific prefixes (`"Swargiya"`, `"Shri"`, `"Late"`, `"स्वर्गीय"`, `"श्री"`) to generate clean possessives, e.g. `"Jeev’s Son"` or `"जीव के पुत्र"`.

---

## 6. Coding Conventions & Guardrails

When modifying or expanding this codebase, strictly adhere to the following rules:

1. **No External Libraries or Bundlers**:
   - Never run `npm install` for frontend packages.
   - Do not introduce Webpack, Vite, Babel, Tailwind, TypeScript, or CSS preprocessors.
   - All browser scripts must be native ES Modules using standard `.js` extensions in imports (e.g., `import { foo } from './tree.js';`).
2. **Node.js Environment**:
   - Node scripts and tests must use standard Node.js built-ins (`node:test`, `node:assert/strict`, `node:fs/promises`, `node:path`).
3. **Bilingual Parity**:
   - Any new user-facing copy or relationship term must be added to **both** `COPY.en` and `COPY.hi` in `js/i18n.js`.
4. **Elder & Accessibility UX**:
   - Maintain minimum tap targets of 44x44px.
   - Preserve `#announcer` calls for screen readers on route changes.
   - Support high-contrast mode (`data-contrast="high"`) and 3 font size tiers (`data-text-size="compact|default|large"`).
   - Ensure avatar fallbacks work gracefully (initials displayed inside styled SVG/CSS box if photo is missing or fails to load).
5. **Testing & Validation**:
   - Always run `npm test` after modifying any logic in `js/`.
   - When adding validation rules, add corresponding positive and negative test cases in `tests/validation.test.js`.

