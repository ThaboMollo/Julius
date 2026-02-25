-- Julius Sync Schema Migration
-- Run this in the Supabase SQL Editor to fix the remote schema.
-- The existing tables were created with an older schema; this drops and
-- recreates them with the correct columns to match the current app.
--
-- Safe to run: all tables are empty (no user data will be lost).

-- ── Step 1: Drop existing tables ────────────────────────────────────────────
-- Drop in reverse-dependency order (children before parents).

drop table if exists public.statement_uploads cascade;
drop table if exists public.bank_configs cascade;
drop table if exists public.bill_ticks cascade;
drop table if exists public.transactions cascade;
drop table if exists public.budget_items cascade;
drop table if exists public.scenario_expenses cascade;
drop table if exists public.purchase_scenarios cascade;
drop table if exists public.recurring_templates cascade;
drop table if exists public.app_settings cascade;
drop table if exists public.sync_state cascade;
drop table if exists public.budget_months cascade;
drop table if exists public.categories cascade;
drop table if exists public.budget_groups cascade;

-- Also drop the helper function from rls.sql if it exists from a prior run.
drop function if exists public.apply_owner_policies(text);

-- ── Step 2: Recreate tables with correct schema ──────────────────────────────

create table public.budget_groups (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.categories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  group_id text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.budget_months (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  month integer not null,
  month_key text not null,
  expected_income numeric null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.recurring_templates (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id text not null,
  category_id text not null,
  name text not null,
  planned_amount numeric not null,
  multiplier numeric not null default 1,
  split_ratio numeric not null default 1,
  is_bill boolean not null default false,
  due_day_of_month integer null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.budget_items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_month_id text not null,
  group_id text not null,
  category_id text not null,
  name text not null,
  planned_amount numeric not null,
  multiplier numeric not null default 1,
  split_ratio numeric not null default 1,
  is_bill boolean not null default false,
  due_date date null,
  is_from_template boolean not null default false,
  template_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.bill_ticks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_month_id text not null,
  budget_item_id text not null,
  is_paid boolean not null default false,
  paid_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_month_id text not null,
  category_id text not null,
  budget_item_id text null,
  amount numeric not null,
  date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.app_settings (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payday_day_of_month integer not null default 25,
  expected_monthly_income numeric null,
  cloud_mode_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.purchase_scenarios (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.scenario_expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id text not null,
  name text not null,
  monthly_amount numeric not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.bank_configs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_name text not null,
  bank_code text not null,
  upload_frequency text not null,
  is_active boolean not null default true,
  last_upload_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.statement_uploads (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_config_id text not null,
  filename text not null,
  uploaded_at timestamptz not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  total_transactions integer not null,
  matched_count integer not null,
  unmatched_count integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.sync_state (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text null,
  last_pull_at timestamptz null,
  last_push_at timestamptz null,
  last_login_at timestamptz null,
  last_sync_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

-- ── Step 3: Enable RLS and create access policies ────────────────────────────

alter table public.budget_groups enable row level security;
alter table public.categories enable row level security;
alter table public.budget_months enable row level security;
alter table public.recurring_templates enable row level security;
alter table public.budget_items enable row level security;
alter table public.bill_ticks enable row level security;
alter table public.transactions enable row level security;
alter table public.app_settings enable row level security;
alter table public.purchase_scenarios enable row level security;
alter table public.scenario_expenses enable row level security;
alter table public.bank_configs enable row level security;
alter table public.statement_uploads enable row level security;
alter table public.sync_state enable row level security;

create or replace function public.apply_owner_policies(table_name text)
returns void
language plpgsql
as $$
begin
  execute format('drop policy if exists %I on public.%I', table_name || '_select', table_name);
  execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', table_name || '_select', table_name);

  execute format('drop policy if exists %I on public.%I', table_name || '_insert', table_name);
  execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', table_name || '_insert', table_name);

  execute format('drop policy if exists %I on public.%I', table_name || '_update', table_name);
  execute format('create policy %I on public.%I for update using (auth.uid() = user_id)', table_name || '_update', table_name);

  execute format('drop policy if exists %I on public.%I', table_name || '_delete', table_name);
  execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', table_name || '_delete', table_name);
end;
$$;

select public.apply_owner_policies('budget_groups');
select public.apply_owner_policies('categories');
select public.apply_owner_policies('budget_months');
select public.apply_owner_policies('recurring_templates');
select public.apply_owner_policies('budget_items');
select public.apply_owner_policies('bill_ticks');
select public.apply_owner_policies('transactions');
select public.apply_owner_policies('app_settings');
select public.apply_owner_policies('purchase_scenarios');
select public.apply_owner_policies('scenario_expenses');
select public.apply_owner_policies('bank_configs');
select public.apply_owner_policies('statement_uploads');
select public.apply_owner_policies('sync_state');
