# Supabase Setup (Developer)

1. Open your Supabase project dashboard.
2. Go to SQL Editor.
3. Run `docs/supabase/schema.sql`.
4. Run `docs/supabase/rls.sql`.
5. In Authentication settings, enable Email + Password sign-in.
6. Ensure your local/prod app URLs are configured as needed for password reset links.

These scripts are intentionally repo-only. The app does not expose setup or migration UI to end users.
