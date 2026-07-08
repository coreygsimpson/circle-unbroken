# Circle Unbroken — Claude Reference

## Project overview

Sequential Bible study platform covering all 66 books, Genesis–Revelation.
Phase 1 (current): Admin CMS for content entry and management.
Phase 2 (planned): Public-facing study reader and cross-reference UI.

## Stack

- **Frontend:** React 19 + Vite 8, no UI framework — all styling is inline or `App.css`
- **Database/Auth:** Supabase (Postgres, Auth, Row Level Security)
- **Video hosting:** Cloudflare Stream (served via iframes)
- **File storage:** Cloudflare R2
- **Hosting:** Cloudflare Pages (with Functions for server-side Cloudflare API calls)

## Key conventions

- Study IDs: `BOOK-CH-LETTER` format — e.g. `GEN-01-A`, `JHN-01-A`. Used consistently in Supabase, Cloudflare Stream metadata, and R2 folder names.
- Status values: `Draft` → `Ready` → `Published`. Non-admin users only see Published studies.
- No UI framework — prefer inline styles for component-scoped layout, `App.css` for shared tokens and global patterns.
- `var(--slate)` / `var(--gold)` / `var(--ink)` etc. are the design tokens defined in `App.css :root`.

## Bible passage APIs

### Public-domain translations → bible-api.com

Free, no auth. Translations: KJV, WEB, ASV, YLT, Darby, BBE.
```
GET https://bible-api.com/{passage}?translation={id}
```
Response shape: `{ verses: [{ chapter, verse, text }], reference, ... }` (or `{ text, ... }` for single verse).

### Licensed translations → api.bible (API.Bible)

Requires `VITE_API_BIBLE_KEY` (api-key header). Used for NKJV and NET.
```
GET https://rest.api.bible/v1/bibles/{bibleId}/passages/{passageId}?content-type=html&...
```
Passage ID format: `GEN.1.1-GEN.1.5` (OSIS/USFM book code + chapter + verse, hyphen-separated range).
Response shape: `{ data: { content: "<html>", copyright: "...", reference: "..." } }`

**Bible IDs** — these are permanent once set; find them by calling `GET /v1/bibles` with your key.
Set as env vars (not secrets, but keep out of source):
- `VITE_BIBLE_ID_NKJV` — Thomas Nelson / NKJV ID (assigned after licensing is approved)
- `VITE_BIBLE_ID_NET` — NET Bible ID (Biblical Studies Press)

**NKJV licensing:** Corey has applied for a license from Thomas Nelson. Until approved and the API key has NKJV access, the NKJV button will show an error state.

**NET Bible:** Available on API.Bible. Free for non-commercial use with attribution. Attribution is included in the `copyright` field of each API response and rendered below the passage text.

**FUMS (Fair Use Monitoring System):** API.Bible may require a tracking pixel/call per passage view. Check the API.Bible docs / dashboard for current requirements and add if needed.

**HTML rendering:** API.Bible returns HTML content. Verse number spans have `class="v"`. Styled via `.api-bible-content .v` in `App.css`.

## Environment variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BIBLE_KEY=              # api.bible API key
VITE_BIBLE_ID_NKJV=             # NKJV Bible ID from /v1/bibles
VITE_BIBLE_ID_NET=              # NET Bible ID from /v1/bibles
```

Cloudflare Stream/R2 credentials go in the Cloudflare Pages dashboard (server-side only).

## Key files

| File | Purpose |
|------|---------|
| `src/pages/StudyViewer.jsx` | Public study reader — video/audio player, Bible passage display, notes, cross-refs |
| `src/pages/StudyEditor.jsx` | Admin form for creating/editing studies |
| `src/pages/TrackDetail.jsx` | Track view with ordered study list |
| `src/components/CrossReferences.jsx` | Cross-reference picker/viewer used in StudyViewer |
| `src/context/AuthContext.jsx` | Session + role state (`user`, `isAdmin`) |
| `supabase/schema.sql` | Base schema — `books`, `studies`, `cross_references` |

## Database schema highlights

- `studies`: `study_id` (PK text), `study_title`, `passage_ref`, `status`, `media_link` (Cloudflare Stream), `audio_link` (R2), `duration_minutes`, `tags` (text[]), `slides_link`
- `books`: linked via `book_id` FK on `studies`
- `tracks` / `track_studies`: ordered playlists of studies
- `study_notes`: per-user notes, upserted on `(user_id, study_id)`
- `study_seeds`: rough idea/notes drafts with status seed/draft/ready
- `profiles`: extends Supabase auth — `role` field (`admin` | `family`)
- `guest_codes`: invite codes for family member signup

## Supabase SQL files (run in order for fresh setup)

1. `schema.sql`
2. `auth_setup.sql`
3. `add_slides_column.sql`
4. `fix_rls_recursion.sql`
5. `add_media_columns.sql`
6. `add_profile_fields.sql`
7. `duration_minutes.sql`
8. `studies_tags.sql`
9. `study_notes.sql`
10. `study_seeds.sql`
11. `tracks.sql`
12. `guest_codes.sql`
13. `cross_references_rls.sql`
14. `fix_study_notes_study_id.sql`
