-- Finance Portal — base schema.
--
-- OPTIONAL: only run this if your Supabase project does not already have these
-- tables. It is reconstructed from how the app reads/writes each table, so if
-- you already have a live database, compare carefully before running.
--
-- Idempotent (IF NOT EXISTS). Run this BEFORE 0001_enable_rls.sql.

create extension if not exists "pgcrypto";

create table if not exists public.categories (
    id            uuid primary key default gen_random_uuid(),
    name          text not null,
    type          text not null default 'expense' check (type in ('income', 'expense')),
    monthly_limit numeric not null default 0,
    workspace     text not null default 'personal',
    created_at    timestamptz not null default now()
);

create table if not exists public.transactions (
    id          uuid primary key default gen_random_uuid(),
    amount      numeric not null default 0,
    date        date not null default current_date,
    note        text,
    category_id uuid references public.categories(id) on delete set null,
    wallet      text not null default 'bank' check (wallet in ('bank', 'cash')),
    workspace   text not null default 'personal',
    created_at  timestamptz not null default now()
);

create table if not exists public.savings_buckets (
    id             uuid primary key default gen_random_uuid(),
    name           text not null,
    target_amount  numeric not null default 0,
    current_amount numeric not null default 0,
    workspace      text not null default 'personal',
    created_at     timestamptz not null default now()
);

create table if not exists public.debts (
    id                uuid primary key default gen_random_uuid(),
    name              text not null,
    original_amount   numeric not null default 0,
    current_balance   numeric not null default 0,
    interest_rate     numeric not null default 0,
    term_months       integer not null default 0,
    min_payment       numeric not null default 0,
    payment_frequency text not null default 'monthly' check (payment_frequency in ('monthly', 'bi-weekly')),
    currency          text not null default 'MXN' check (currency in ('MXN', 'USD')),
    workspace         text not null default 'personal',
    created_at        timestamptz not null default now()
);

-- Indexes matching the app's common filters/sorts.
create index if not exists transactions_workspace_date_idx on public.transactions (workspace, date);
create index if not exists categories_workspace_idx on public.categories (workspace);
