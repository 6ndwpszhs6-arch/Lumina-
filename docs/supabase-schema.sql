-- Metabo forum (news & research) schema.
-- Run this once in your Supabase project's SQL editor.

create table if not exists forum_posts (
  id uuid primary key,
  title text not null,
  summary text not null default '',
  content text not null,
  category text not null check (category in ('diabetes', 'pku', 'metabolism', 'nutrition_research', 'general_news')),
  source_name text not null,
  source_url text not null,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_posts_published_at_idx on forum_posts (published_at desc);

alter table forum_posts enable row level security;

-- Anyone (the anon key used by the app) may read published posts only.
create policy "public can read published posts"
  on forum_posts for select
  using (published = true);

-- No insert/update/delete policy is defined for the anon/authenticated
-- roles on purpose: only the service role key (used server-side by the
-- admin API routes) can write, which bypasses RLS entirely.

-- Metabo Premium subscriptions, synced from Stripe via webhook. Since the
-- app has no login system, email is the link between a Stripe customer and
-- the on-device Premium flag — see src/lib/subscription.ts.
create table if not exists subscriptions (
  email text primary key,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_customer_id_idx on subscriptions (stripe_customer_id);

alter table subscriptions enable row level security;

-- No policy is defined for anon/authenticated on purpose: the app never
-- queries this table from the browser. Only the service role key (used
-- server-side by the subscription API routes) can read or write it.
