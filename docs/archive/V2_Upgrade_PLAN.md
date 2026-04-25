# PLAN.md — Spending Tracker PWA v2 (Auth + Supabase + Safe Migration + Encryption)

Owner: Thabo  
Constraint: **NO CURRENT USER SHOULD LOSE THEIR DATA** (NON‑NEGOTIABLE)  
Current state: Local-first PWA (IndexedDB via Dexie)  
Target state: Hybrid local-first + Supabase (Auth + Postgres) with safe migration and optional encryption

====================================================================
SECTION 0 — ABSOLUTE RULES (AGENT MUST NOT DEVIATE)
====================================================================

1. DO NOT remove IndexedDB.
2. DO NOT destructively modify local schema.
3. DO NOT delete local data automatically.
4. Migration must be idempotent.
5. All cloud writes must be scoped by user_id with RLS enabled.
6. Feature flags must gate risky features.
7. Add export backup before any migration occurs.

====================================================================
SECTION 1 — SUPABASE FULL SETUP (URL + ANON KEY BASED)
====================================================================

The agent must assume only:

- Supabase Project URL
- Supabase Anon Public Key

No service_role key allowed in frontend.

---

## 1.1 Environment Configuration

Create:

.env.example
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

App must read via:
import.meta.env.VITE_SUPABASE_URL
import.meta.env.VITE_SUPABASE_ANON_KEY

Fail fast if missing.

---

## 1.2 Install & Configure Client

Install:
@supabase/supabase-js

Create:
src/cloud/supabaseClient.ts

- Initialize Supabase client
- Export singleton instance
- Handle auth state change listener
- Do NOT expose service role keys

---

## 1.3 Generate Required SQL Files

Agent MUST generate:

docs/supabase/schema.sql
docs/supabase/rls.sql
docs/supabase/README.md

schema.sql must:

- Create tables:
  budget_groups
  categories
  budget_months
  budget_items
  transactions
  bill_ticks
  recurring_templates
  user_settings
  sync_state
- Include:
  id TEXT PRIMARY KEY
  user_id UUID REFERENCES auth.users(id)
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
  deleted_at TIMESTAMPTZ NULL

rls.sql must:

- Enable RLS on every table
- Create policies:
  SELECT using (auth.uid() = user_id)
  INSERT with check (auth.uid() = user_id)
  UPDATE using (auth.uid() = user_id)
  DELETE using (auth.uid() = user_id)

README.md must contain EXACT setup steps:

1. Open Supabase dashboard
2. Go to SQL Editor
3. Run schema.sql
4. Run rls.sql
5. Enable Email OTP in Auth settings
6. Return to app
7. Verify Setup page shows all checks green

---

## 1.4 Supabase Setup Verification Page

Create:

src/pages/settings/SupabaseSetup.tsx

This page must:

- Test auth session
- Attempt SELECT 1 from each expected table (limit 1)
- Show checklist:
  - Auth working
  - Tables exist
  - RLS active (best effort)
- Provide “Copy SQL” button for schema.sql
- Provide “Copy RLS” button

====================================================================
SECTION 2 — AUTHENTICATION
====================================================================

Implement Supabase Email OTP authentication.

Must include:

- Login screen
- Logout
- Session provider
- Continue offline without login option

Auth state must not block local usage.

====================================================================
SECTION 3 — SAFE MIGRATION STRATEGY
====================================================================

3.1 Add Export Backup

- Download all local data as JSON
- Include schema version + timestamp

  3.2 Add migration_journal table locally
  Fields:

- id
- status
- last_step
- started_at
- completed_at
- error

  3.3 Preflight logic
  On login:

- Count local records
- Count cloud records
- Determine case:

Case A:
cloud empty + local has data → upload local (upsert)

Case B:
cloud has data + local has data → ask user:

- Use cloud
- Upload local
  Default: ASK USER (never overwrite automatically)

Case C:
both empty → nothing

3.4 Migration algorithm
For each table:

- fetch local rows
- transform (add user_id)
- upsert by id
- record progress in journal

Migration must be restart-safe.

3.5 After migration

- DO NOT delete local
- Set cloud_mode_enabled = true
- Display confirmation banner

====================================================================
SECTION 4 — SYNC ARCHITECTURE (PHASED)
====================================================================

4.1 Add updated_at + deleted_at locally
All writes update updated_at
Deletes become soft deletes

4.2 Push
Local rows changed since last_push_at → upsert to cloud

4.3 Pull
Cloud rows changed since last_pull_at → upsert locally

4.4 Conflict resolution
Last write wins using updated_at
If equal → prefer cloud

4.5 Sync triggers

- Manual “Sync now”
- On login
- On app focus

====================================================================
SECTION 5 — ENCRYPTION (AFTER MIGRATION STABLE)
====================================================================

Encrypt ONLY sensitive text fields (e.g., transaction notes).

Use:
WebCrypto AES-GCM
PBKDF2 with user passphrase + salt

Create:
src/crypto/

Never store passphrase in database.

Encryption must be optional via feature flag.

====================================================================
SECTION 6 — FEATURE FLAGS
====================================================================

Create src/config/flags.ts

ENABLE_AUTH
ENABLE_SUPABASE
ENABLE_MIGRATION
ENABLE_SYNC
ENABLE_ENCRYPTION

Start with:
AUTH + SUPABASE + MIGRATION enabled
SYNC + ENCRYPTION disabled

====================================================================
SECTION 7 — NO DATA LOSS VALIDATION
====================================================================

Must pass:

1. Existing offline user still sees data without login.
2. Migration runs twice without duplication.
3. Killing app mid-migration resumes safely.
4. Local data remains after migration.
5. RLS blocks cross-user access.
6. Offline → online → sync uploads correctly.

====================================================================
SECTION 8 — FINAL DELIVERABLES
====================================================================

Agent must deliver:

- Updated application code
- Supabase setup page
- schema.sql
- rls.sql
- README.md with setup steps
- Migration wizard
- Backup export
- Sync scaffolding
- Encryption module (feature flagged)

====================================================================
IMPLEMENTATION STATUS (2026-02-25)
====================================================================

## Section 1 — Supabase Full Setup

- [x] `.env.example` created with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [x] `src/config/flags.ts` added and wired for rollout defaults
- [x] `src/cloud/supabaseClient.ts` added with singleton + auth state listener helper
- [x] `docs/supabase/schema.sql` generated
- [x] `docs/supabase/rls.sql` generated
- [x] `docs/supabase/README.md` generated with exact setup steps
- [x] `src/pages/settings/SupabaseSetup.tsx` added (auth/table checks + Copy SQL/RLS)

## Section 2 — Authentication

- [x] `AuthProvider` implemented (`src/auth/AuthProvider.tsx`)
- [x] Email OTP login page implemented (`src/pages/auth/LoginPage.tsx`)
- [x] Logout implemented in Settings cloud account section
- [x] Continue offline without login implemented
- [x] Cloud-only pages route-guarded (`RequireCloudAuth`)
- [x] Local usage remains available without login

## Section 3 — Safe Migration Strategy

- [x] Export backup implemented (`src/sync/backupExport.ts`) with schema version + timestamp
- [x] Local `migration_journal` table added (Dexie version 3)
- [x] `MigrationService` preflight cases implemented (A/B/C detection)
- [x] Migration wizard page implemented (`src/pages/settings/MigrationWizard.tsx`)
- [x] Idempotent upsert migration path implemented (local -> cloud by stable `id`)
- [x] Journal status/step/error tracking implemented
- [x] Local data retained after migration; `cloudModeEnabled` set
- [ ] Auto-show migration wizard immediately on login when local data exists

## Section 4 — Sync Architecture (Phased)

- [x] Manual `SyncService` scaffold added (`src/sync/SyncService.ts`)
- [x] Feature-gated `Sync now` button added in Settings
- [ ] Local `deleted_at` soft-delete model not yet implemented in Dexie entities
- [ ] Incremental push/pull by `last_push_at` / `last_pull_at` not yet implemented
- [ ] Full conflict engine (LWW + tie cloud) not yet fully wired for all entities

## Section 5 — Encryption

- [x] WebCrypto module added (`src/crypto/index.ts`)
- [x] Implemented `deriveKey`, `encryptString`, `decryptString`, and salt generation
- [ ] Encryption settings UI/passphrase flow not yet implemented
- [ ] Sensitive field encryption integration not yet wired to transactions

## Section 6 — Feature Flags

- [x] `ENABLE_AUTH`
- [x] `ENABLE_SUPABASE`
- [x] `ENABLE_MIGRATION`
- [x] `ENABLE_SYNC`
- [x] `ENABLE_ENCRYPTION`

## Build Verification

- [x] TypeScript + production build passes (`npm run build`)
- [x] New upgrade modules lint clean (targeted `eslint` run on new files)

====================================================================
END OF PLAN
====================================================================
