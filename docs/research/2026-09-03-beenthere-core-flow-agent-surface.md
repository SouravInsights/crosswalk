# The agent surface of beenthere's core flow: create and publish a trip story

> Reviews only beenthere's core app UI, scoped to one complete flow. Repo:
> `beenthere-apps/beenthere`, web app `apps/web`, Sep 3 2026. Findings are
> folded into `docs/specs/generation-pipeline.md`; see §4.

---

## 1. The flow under review

BeenThere is a travel storytelling platform. Its core loop, end to end:

1. **`/me`: create the trip.** `CreateTripCard.tsx`: a 3D folder graphic with
   a "magic buttonless input" for the title, a custom `DateInput`, a custom
   `LocationInput`, and a deferred cover-photo upload.
2. **`/me/[tripId]`: write the story.** A block editor (`TripCanvas`) with
   travel-specific blocks: Heading, Photo, PhotoCluster, Checklist, MapPin,
   Listicle, BuddyHighlight, PromptCard. Autosave, a media library with
   in-progress "field notes", and AI story generation
   (`POST /v1/trips/{tripId}/story/generate`).
3. **Publish: share it.** The trip becomes public at
   `/[username]/[tripSlug]`.

## 2. The surfaces, as they actually are

| Surface | Literal `<form>`? | Backed by a contract today? | What submit does |
|---|---|---|---|
| CreateTripCard (title, date, location, cover) | No | Partially: `POST /v1/trips` is in the OpenAPI spec | Orchestration, not one call: `createTrip` → flush cover upload → `updateTrip` → invalidate cache → navigate to the editor |
| Title input | No (raw `<input>`, no `name`) | No | `handleCreate` on Enter or arrow button |
| LocationInput | No (custom autocomplete) | Yes: `autocompletePlaces` + `getPlaceDetails` API | Search, pick, resolve a structured `TripLocationObject` |
| DateInput | No (custom control) | No | Sets a date string |
| Editor (blocks, autosave, media library) | No | Yes: `/v1/trips/{tripId}/blocks` incl. batch | Editor store + autosave + query cache |
| AI story generation | No (a button) | Yes: `/v1/trips/{tripId}/story/generate` | Generates story content into the trip |

**Zero of the core flow's surfaces use a literal `<form>` element.** The only
`<form>` tags in the entire web app are a playground page, a testing login,
and auth buttons.

## 3. What the evidence says

**F1. For beenthere-class products, the form lane covers nothing in the core
loop.** The article leads with forms because Chrome's declarative API targets
form elements and the article's verticals are data-entry shaped (timesheets,
claims, inquiries). A storytelling product's core loop is creative and
stateful: cards, canvases, autocompletes. Form tools are a real lane, but they
are the small case for this class of app.

**F2. beenthere's contract situation is already excellent.** Fastify + TypeBox
on the server, `openapi.json` as a generated artifact, a typed SDK on top. All
73 operations, including `createTrip`, `updateTrip`, blocks, and
`story/generate`, are already generatable as tools by the existing OpenAPI
lane. No new source is needed to *find* the contracts.

**F3. Raw endpoint tools would bypass the product.** If an agent calls the
generated `create-trip` endpoint tool directly, the trip is created but the
app's behavior is skipped: no cover-photo dance, no cache invalidation, no
navigation into the editor, no editor store. The Chrome build-tools doc says
tools should support the user's goal "relevant to your product and existing
capabilities", and the use-cases article's `start_claim_process` "navigates to
the correct form". Both point the same way: **the right agent surface is the
app's own action layer** (what `handleCreate` does), not the raw endpoint.

**F4. Some inputs need agent-reachable prerequisites.** `locationObject` is a
structured object an agent cannot invent; it comes from
`autocompletePlaces(text)` then `getPlaceDetails(placeId)`. So a usable
"create-trip" tool needs a companion "search-places" tool, and its description
must say where the value comes from. This is the article's search-then-act
pattern showing up naturally in a real flow, and it is checkable: an audit
rule can flag "input type only producible by another tool that does not
exist".

**F5. Validation is hand-rolled today.** `if (!title.trim()) toast.error(...)`
in `CreateTripCard`, `if (!userAnswer || !context)` in the quiz route. Writing
the schemas improves the app itself (server already speaks TypeBox; sharing
them through `packages/shared` is the natural home), exactly the forcing
function the OpenAPI constraint provided for APIs.

## 4. What this means for the schema source spec

The **`schema` source is the product**; outputs are two lanes over
the same reviewed candidates:

- **`tools` output**: generates the contract
  (name, description, inputSchema, hints, safety classification) as a
  `.webmcp.ts` file; the developer wires `execute()` to the app's own action
  layer. For CreateTripCard that body calls the same `apiClient` sequence
  `handleCreate` runs, then navigates. The article's "start the process and
  take the user to the right place" pattern, with the codegen owning the
  contract and the dev owning the behavior, exactly the marker-split
  philosophy the `tools` output already implements for OpenAPI.
- **`form` output** (when a literal form exists): annotate it. Real, but the small
  case for this class of app.

Both lanes share the source, the safety review, and the audit pass. The spec's
examples all come from this flow.

## 5. The concrete picture: create-trip as a generated tool

Step 0, the contract (once, shared with the app itself):

```ts
// packages/shared/src/schemas/trip.ts
import { z } from "zod";

export const CreateTripInput = z.object({
  title: z.string().min(1).max(40)
    .describe("Name of the trip, e.g. 'Kyoto in autumn'. 40 characters max."),
  startDate: z.string().optional()
    .describe("When the trip happened, e.g. '2026-03-14'. Optional."),
  locationObject: z.record(z.string(), z.unknown()).optional()
    .describe("Resolved place object. Always get this from the search-places tool; never invent it."),
});
```

Step 1, point at it:

```js
// apps/web/codegen.config.mjs
export default defineConfig({
  sources: [
    schema({
      tools: [
        { name: "create-trip", schema: CreateTripInput },
        { name: "search-places", schema: SearchPlacesInput },
      ],
    }),
  ],
  outputs: [tools({ outDir: "./src/webmcp" })],
});
```

Step 2, `generate` writes `src/webmcp/create-trip.webmcp.ts`: the generated
region carries the contract (name, description, the input schema with the
descriptions above, hints, the confirmation gate, since this is a write). The
owned region scaffolds `executeCreateTrip`, which the developer wires to the
app's own flow:

```ts
export async function executeCreateTrip(input: CreateTripInput) {
  // Same sequence the Create button runs: create, then land the user in the editor.
  const trip = await apiClient.createTrip({ id: crypto.randomUUID(), ...input });
  router.push(`/me/${trip.id}`);
  return toolResult(`Trip "${input.title}" created and opened in the editor.`);
}
```

And the audit earns its keep on day one: `locationObject` is only producible
by `search-places`, so if the developer declares `create-trip` without
`search-places`, the report says the tool has an input agents cannot fill.

## 6. What the agent experience becomes

The user comes back from Kyoto, opens their beenthere profile, and tells the
agent: "Create a trip for my Kyoto week, March 2026." The agent calls
`search-places("Kyoto")`, gets the structured place, calls `create-trip` with
title and place, the user confirms (write gate), and the app does what it
always does: the trip exists and the editor opens on it. The agent then says
"the trip is created and open; want me to draft the story from your uploaded
photos?" (`story/generate` exists). Every step used the product's own
capabilities, and the human confirmed the one step that changes anything.

That is the article's warranty-claim journey, rebuilt on a real core flow:
navigate, fill, confirm, hand off to the human for the creative part.

## 7. Practical notes found along the way

- `packages/shared` is the right home for the schemas (web and mobile both
  consume it), but it is on zod v3 while `apps/web` has zod v4. JSON Schema
  conversion differs (`zod-to-json-schema` vs native `z.toJSONSchema()`). The
  schema source must detect the major version; added to the spec's open
  questions.
- The editor's autosave and query cache mean agent-driven block edits should
  go through the editor store when the editor is open, not around it. That is
  an `execute()` wiring concern, and a good docs-page example of "wire tools
  to your app's actions, not past them".
