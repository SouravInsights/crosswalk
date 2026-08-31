# webmcp-stack brand assets

## Mark

Three isometric layers; the top layer is solid accent. A stack of tools, one of them live.

| File | Use |
|---|---|
| `logo-mark.svg` | Transparent, light strokes — dark backgrounds |
| `logo-mark-light.svg` | Transparent, dark strokes — light backgrounds |
| `logo-mark-tile.svg` | Mark on the dark rounded tile — avatars, favicons |

## Wordmark

One lowercase word, `webmcpstack`, JetBrains Mono, color split at the family
boundary: `webmcp` in ink, `stack` in accent. Product surfaces append a dim
suffix: `webmcpstack / codegen`. In prose and URLs, write the family name with
the hyphen: `webmcp-stack`.

## Colors

| Token | Hex |
|---|---|
| Ink | `#e9ecf2` |
| Accent | `#58a6ff` |
| Background | `#0a0b0f` |

## PNG exports

Rasterized from the SVGs with `render.js` (`node render.js` in this
directory, `npm i sharp` first):

| File | Size |
|---|---|
| `png/mark-dark-512.png` | 512px mark, transparent, light strokes |
| `png/mark-light-512.png` | 512px mark, transparent, dark strokes |
| `png/avatar-tile-512.png` | 512px dark tile — GitHub/npm/Twitter avatars |
| `png/avatar-tile-1024.png` | 1024px dark tile |
