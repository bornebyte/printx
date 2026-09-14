# Supabase setup

Apply `migrations/202609140001_initial_schema.sql` to the Supabase project before using the dashboards. The migration enables Row Level Security on every application table. The web server uses the Supabase backend secret only in server routes, so that key must never be exposed as a `NEXT_PUBLIC_*` variable.

Required frontend environment variables:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
```

`SUPABASE_SECRET_KEY` is the backend-only secret key from Supabase Settings → API Keys. A legacy `SUPABASE_SERVICE_ROLE_KEY` JWT beginning with `eyJ` is also supported, but never expose either key as a `NEXT_PUBLIC_*` variable. The Firebase Admin variables allow the server to verify the Firebase ID token before resolving a profile or business membership. Dashboard queries are therefore scoped by the verified Firebase identity rather than by a client-provided user id.

For local setup, run `migrations/202609140001_initial_schema.sql` in the Supabase SQL Editor or use the Supabase CLI migration workflow. Verify it with:

```sql
select to_regclass('public.profiles');
```

It should return `public.profiles`. If the table exists but the Data API still reports a schema-cache error, run `NOTIFY pgrst, 'reload schema';` in the SQL Editor. Then sign up through `/auth`; PrintX will create the matching profile, and a Business account will receive a six-character business code and membership record.
