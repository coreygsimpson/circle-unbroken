# May the Circle Be Unbroken

A sequential Bible study platform covering all 66 books, Genesis through Revelation — built as an admin CMS + content entry tool, with a public study experience planned for a future phase.

## Stack

- **Frontend:** React + Vite
- **Database/Auth:** Supabase (Postgres, Auth, Row Level Security)
- **Video hosting:** Cloudflare Stream
- **File storage:** Cloudflare R2
- **Hosting:** Cloudflare Pages

## Local development

1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key (found in Supabase → Settings → API)
4. `npm run dev`

## Database setup

Run these SQL files in order via the Supabase SQL Editor:

1. `supabase/schema.sql` — creates `books`, `studies`, `cross_references` tables
2. `supabase/auth_setup.sql` — creates `profiles` table, role system, auto-signup trigger
3. `supabase/add_slides_column.sql` — adds the `slides_link` column
4. `supabase/fix_rls_recursion.sql` — fixes an RLS recursion bug in the original admin policies

After signing up for your first account in the app, run this once (with your real email) to become the first admin:

```sql
update profiles set role = 'admin' where email = 'your-email@example.com';
```

## Data import

`data/books_import.csv` and `data/studies_import.csv` can be imported directly via the Supabase Table Editor (Insert → Import data from CSV).

## Project structure

```
src/
  components/   - shared UI (AdminLayout, ProtectedRoute)
  context/      - AuthContext (session + role management)
  lib/          - Supabase client
  pages/        - route-level pages (auth screens + admin CMS)
```

## Naming convention

Study IDs follow `BOOK-CH-LETTER` format, e.g. `GEN-01-A`, `JHN-01-A`. This convention is used consistently across Supabase, Cloudflare Stream metadata, and R2 folder names.

## Status

Admin CMS (auth, roles, study entry) is functional. Public-facing study reader and cross-reference UI are not yet built.
