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
  image_url text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe to re-run on a table created before image_url existed.
alter table forum_posts add column if not exists image_url text;

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
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  -- 'stripe' = real billing via the webhook. 'manual' = comped/granted by
  -- you via /admin, with no Stripe customer behind it.
  source text not null default 'stripe',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- Safe to re-run on a table created before these existed.
alter table subscriptions alter column stripe_customer_id drop not null;
alter table subscriptions add column if not exists source text not null default 'stripe';

create index if not exists subscriptions_customer_id_idx on subscriptions (stripe_customer_id);

alter table subscriptions enable row level security;

-- No policy is defined for anon/authenticated on purpose: the app never
-- queries this table from the browser. Only the service role key (used
-- server-side by the subscription API routes) can read or write it.

-- Metabo user accounts (Supabase Auth). Signing in is optional — the app
-- keeps working fully local/offline otherwise — but once logged in, these
-- tables let profile, TDEE history, food log, and chat history follow the
-- user across devices. See src/lib/sync.ts.
--
-- Each policy uses auth.uid() = user_id, so a signed-in user can only ever
-- read/write their own rows — enable email or Google sign-in for your
-- project under Authentication -> Providers in the Supabase dashboard.

create table if not exists profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text,
  sex text,
  age integer,
  height_cm numeric,
  weight_kg numeric,
  activity_level text,
  goal text,
  units text not null default 'metric',
  conditions text[] not null default '{}',
  other_condition_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "users manage their own profile" on profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists tdee_history (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  goal text not null,
  bmr integer not null,
  tdee integer not null,
  target_calories integer not null,
  protein_g numeric not null,
  fat_g numeric not null,
  carbs_g numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists tdee_history_user_id_idx on tdee_history (user_id);
alter table tdee_history enable row level security;
create policy "users manage their own tdee history" on tdee_history for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists food_log (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  barcode text not null,
  product_name text not null,
  brand text,
  basis text not null,
  servings numeric not null,
  nutrients jsonb not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists food_log_user_id_idx on food_log (user_id);
alter table food_log enable row level security;
create policy "users manage their own food log" on food_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Safe to re-run on a table created before deleted_at existed. Entries are
-- soft-deleted (tombstoned) here instead of hard-deleted so a deletion made
-- on one device propagates to every other synced device instead of the
-- union merge quietly resurrecting the row.
alter table food_log add column if not exists deleted_at timestamptz;

create table if not exists chat_messages (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_user_id_idx on chat_messages (user_id);
alter table chat_messages enable row level security;
create policy "users manage their own chat messages" on chat_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
