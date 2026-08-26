-- Lumina forum (news & research) schema.
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
