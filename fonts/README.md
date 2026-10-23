# Optional self-hosted fonts

The app uses `Noto Sans Devanagari` and `Noto Serif Devanagari` when they are installed, with reliable system fallbacks. To self-host them, add licensed WOFF2 subsets here and declare them with `@font-face` at the top of `css/tokens.css`. Keep `font-display: swap` and include both Latin and Devanagari glyph ranges.
