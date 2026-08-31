# webmcp-stack brand assets

## Mark

Three isometric layers; the top layer is solid accent. A stack of tools, one of them live.

| File | Use |
|---|---|
| `logo-mark.svg` | Transparent, light strokes — dark backgrounds |
| `logo-mark-light.svg` | Transparent, dark strokes — light backgrounds |
| `logo-mark-tile.svg` | Mark on the dark rounded tile — avatars, favicons |

## Wordmark

One lowercase word, `webmcpstack`, JetBrains Mono Medium as vector paths (no
font dependency), color split at the family boundary: `webmcp` in ink, `stack`
in accent. In prose and URLs, write the family name with the hyphen:
`webmcp-stack`.

| File | Use |
|---|---|
| `wordmark-light-on-dark.svg` | Mark + wordmark, light text — dark backgrounds |
| `wordmark-dark-on-light.svg` | Mark + wordmark, dark text — light backgrounds |

## Colors

| Token | Hex |
|---|---|
| Ink | `#e9ecf2` |
| Accent | `#58a6ff` |
| Background | `#0a0b0f` |

## Regenerating

- `node wordmark.js` rebuilds the wordmark SVGs from the JetBrains Mono
  Medium TTF (`npm i opentype.js`; drop the TTF at `fonts/ttf/`). Text is
  converted to paths, so the SVGs render correctly everywhere.
- `node render.js` and `node render-wordmarks.js` rasterize the SVGs to the
  PNGs in `png/` (`npm i sharp` first).
- `webmcp-stack-brand.zip` is the downloadable kit, mirrored at
  `site/public/brand/` for the brand page.

## PNG exports

| File | Size |
|---|---|
| `png/mark-dark-512.png` | 512px mark, transparent, light strokes |
| `png/mark-light-512.png` | 512px mark, transparent, dark strokes |
| `png/wordmark-light-on-dark-1024.png` | 1024px wordmark, transparent, light text |
| `png/wordmark-dark-on-light-1024.png` | 1024px wordmark, transparent, dark text |
| `png/avatar-tile-512.png` | 512px dark tile — GitHub/npm/Twitter avatars |
| `png/avatar-tile-1024.png` | 1024px dark tile |
