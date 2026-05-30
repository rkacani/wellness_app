--This SQL script sets up the database schema for a workout application, including tables for week programs and exercises, as well as row-level security policies to ensure that users can only access their own data.

create extension if not exists pgcrypto;

create table if not exists public.week_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.exercises
  add column if not exists exercise_type_id uuid references public.exercise_type(id);

create table if not exists public.exercise_type (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  media_url text,
  created_at timestamptz not null default now()
);

insert into public.exercise_type (name, media_url)
values
  ('Bench Press', 'https://gymvisual.com/img/p/3/3/1/3/9/33139.gif'),
  ('Pull Up', 'https://gymvisual.com/img/p/5/4/1/2/5412.gif'),
  ('Squat', 'https://gymvisual.com/img/p/2/4/9/8/4/24984.gif'),
  ('Deadlift', 'https://gymvisual.com/img/p/2/5/0/2/8/25028.gif'),
  ('Barbell Shoulder', 'https://gymvisual.com/img/p/2/4/9/6/2/24962.gif')
on conflict (name) do nothing;

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.week_programs(id) on delete cascade,
  exercise_type_id uuid references public.exercise_type(id),
  day_of_week text not null check (
    day_of_week in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')
  ),
  rank integer not null default 0,
  name text not null,
  duration_seconds integer not null check (duration_seconds > 0),
  sets integer not null check (sets > 0),
  rest_seconds integer not null check (rest_seconds >= 0),
  weight_kg numeric(6,2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  target_aim text not null default 'daily' check (target_aim in ('daily','weekly','monthly','custom')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null,
  completed_at timestamptz not null default now()
);

create index if not exists idx_week_programs_user 
  on public.week_programs(user_id);

create index if not exists idx_exercises_program_day_rank 
  on public.exercises(program_id, day_of_week, rank);

create index if not exists idx_habits_user
  on public.habits(user_id);

create index if not exists idx_habit_completions_user_completed_at
  on public.habit_completions(user_id, completed_at desc);

create index if not exists idx_habit_completions_habit_completed_at
  on public.habit_completions(habit_id, completed_at desc);

alter table public.week_programs enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_type enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;

-- WEEK PROGRAM POLICIES
drop policy if exists "Users read own programs" on public.week_programs;
create policy "Users read own programs"
on public.week_programs
for select
using (auth.uid() = user_id);

drop policy if exists "Users insert own programs" on public.week_programs;
create policy "Users insert own programs"
on public.week_programs
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update own programs" on public.week_programs;
create policy "Users update own programs"
on public.week_programs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete own programs" on public.week_programs;
create policy "Users delete own programs"
on public.week_programs
for delete
using (auth.uid() = user_id);

-- EXERCISE TYPE POLICIES
drop policy if exists "Public read exercise types" on public.exercise_type;
create policy "Public read exercise types"
on public.exercise_type
for select
using (true);

-- EXERCISES POLICIES
drop policy if exists "Users read own exercises" on public.exercises;
create policy "Users read own exercises"
on public.exercises
for select
using (
  exists (
    select 1
    from public.week_programs wp
    where wp.id = exercises.program_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists "Users insert own exercises" on public.exercises;
create policy "Users insert own exercises"
on public.exercises
for insert
with check (
  exists (
    select 1
    from public.week_programs wp
    where wp.id = exercises.program_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists "Users update own exercises" on public.exercises;
create policy "Users update own exercises"
on public.exercises
for update
using (
  exists (
    select 1
    from public.week_programs wp
    where wp.id = exercises.program_id
      and wp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.week_programs wp
    where wp.id = exercises.program_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists "Users delete own exercises" on public.exercises;
create policy "Users delete own exercises"
on public.exercises
for delete
using (
  exists (
    select 1
    from public.week_programs wp
    where wp.id = exercises.program_id
      and wp.user_id = auth.uid()
  )
);