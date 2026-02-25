-- RLS policies for Julius sync tables

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
  execute format('drop policy if exists %I_select on public.%I', table_name, table_name);
  execute format('create policy %I_select on public.%I for select using (auth.uid() = user_id)', table_name, table_name);

  execute format('drop policy if exists %I_insert on public.%I', table_name, table_name);
  execute format('create policy %I_insert on public.%I for insert with check (auth.uid() = user_id)', table_name, table_name);

  execute format('drop policy if exists %I_update on public.%I', table_name, table_name);
  execute format('create policy %I_update on public.%I for update using (auth.uid() = user_id)', table_name, table_name);

  execute format('drop policy if exists %I_delete on public.%I', table_name, table_name);
  execute format('create policy %I_delete on public.%I for delete using (auth.uid() = user_id)', table_name, table_name);
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
