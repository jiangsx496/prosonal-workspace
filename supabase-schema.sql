-- ============================================================
-- Personal Workspace — Supabase 建表 SQL
-- 使用方法：Supabase Dashboard → SQL Editor → New Query → 粘贴 → Run
-- ============================================================

-- 启用 UUID 扩展
create extension if not exists "pgcrypto";

-- ============================================================
-- 用户数据表（Supabase Auth 自带 auth.users，我们只建数据表）
-- 策略：每张表通过 RLS 隔离，用户只能看自己的数据
-- ============================================================

-- tasks
create table if not exists public.tasks (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- goals
create table if not exists public.goals (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- habits
create table if not exists public.habits (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- daily_plans
create table if not exists public.daily_plans (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- plans
create table if not exists public.plans (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- notes
create table if not exists public.notes (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- journals
create table if not exists public.journals (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- inbox_items
create table if not exists public.inbox_items (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- projects
create table if not exists public.projects (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- reminders
create table if not exists public.reminders (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- focus_sessions
create table if not exists public.focus_sessions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- interview_progress
create table if not exists public.interview_progress (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- interview_custom
create table if not exists public.interview_custom (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security（行级安全策略）
-- 每个用户只能 CRUD 自己的数据
-- ============================================================

-- 对所有表启用 RLS
alter table public.tasks enable row level security;
alter table public.goals enable row level security;
alter table public.habits enable row level security;
alter table public.daily_plans enable row level security;
alter table public.plans enable row level security;
alter table public.notes enable row level security;
alter table public.journals enable row level security;
alter table public.inbox_items enable row level security;
alter table public.projects enable row level security;
alter table public.reminders enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.interview_progress enable row level security;
alter table public.interview_custom enable row level security;

-- 为每张表创建策略：用户只能操作 user_id = auth.uid() 的行
-- 使用一个循环简化（Supabase SQL Editor 支持 do $$ 块）
do $$
declare
  tbl text;
  tables text[] := array[
    'tasks', 'goals', 'habits', 'daily_plans', 'plans',
    'notes', 'journals', 'inbox_items', 'projects',
    'reminders', 'focus_sessions', 'interview_progress', 'interview_custom'
  ];
begin
  foreach tbl in array tables loop
    -- SELECT: 用户只能查自己的
    execute format('create policy "%1$s_select" on public.%1$s for select using (user_id = auth.uid());', tbl);
    -- INSERT: 用户只能插自己的
    execute format('create policy "%1$s_insert" on public.%1$s for insert with check (user_id = auth.uid());', tbl);
    -- UPDATE: 用户只能改自己的
    execute format('create policy "%1$s_update" on public.%1$s for update using (user_id = auth.uid());', tbl);
    -- DELETE: 用户只能删自己的
    execute format('create policy "%1$s_delete" on public.%1$s for delete using (user_id = auth.uid());', tbl);
  end loop;
end $$;

-- ============================================================
-- updated_at 自动更新触发器
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  tbl text;
  tables text[] := array[
    'tasks', 'goals', 'habits', 'daily_plans', 'plans',
    'notes', 'journals', 'inbox_items', 'projects',
    'reminders', 'focus_sessions', 'interview_progress', 'interview_custom'
  ];
begin
  foreach tbl in array tables loop
    execute format('drop trigger if exists %1$s_updated_at on public.%1$s;', tbl);
    execute format('create trigger %1$s_updated_at before update on public.%1$s for each row execute function public.handle_updated_at();', tbl);
  end loop;
end $$;
