-- Julius Spending Tracker PWA
-- Supabase schema for silent upload + bidirectional sync

create table if not exists public.budget_groups (
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

create table if not exists public.categories (
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

create table if not exists public.budget_months (
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

create table if not exists public.recurring_templates (
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

create table if not exists public.budget_items (
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

create table if not exists public.bill_ticks (
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

create table if not exists public.transactions (
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

create table if not exists public.app_settings (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payday_day_of_month integer not null default 25,
  expected_monthly_income numeric null,
  cloud_mode_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists public.purchase_scenarios (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists public.scenario_expenses (
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

create table if not exists public.bank_configs (
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

create table if not exists public.statement_uploads (
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

create table if not exists public.sync_state (
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
