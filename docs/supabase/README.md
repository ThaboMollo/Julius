# Supabase Setup (Developer)

1. Open your Supabase project dashboard.
2. Go to SQL Editor.
3. Run `docs/supabase/schema.sql`.
4. Run `docs/supabase/rls.sql`.
5. In Authentication settings, enable Email OTP (passwordless magic link).
6. Ensure your local/prod redirect URLs are configured.

These scripts are intentionally repo-only. The app does not expose setup or migration UI to end users.
