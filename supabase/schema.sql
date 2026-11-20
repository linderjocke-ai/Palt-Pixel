-- Palt & pixel: sparningar per användare och spel
-- Kör i Supabase: SQL Editor → New query → klistra in → Run.

create table if not exists public.sparningar (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  spel       text        not null check (spel ~ '^[a-z0-9-]{1,40}$'),
  data       jsonb       not null,
  sparad_at  timestamptz not null default now(),
  primary key (user_id, spel)
);

alter table public.sparningar enable row level security;

-- Varje användare ser och ändrar bara sina egna sparningar
create policy "egna sparningar: läsa"   on public.sparningar for select using (auth.uid() = user_id);
create policy "egna sparningar: skapa"  on public.sparningar for insert with check (auth.uid() = user_id);
create policy "egna sparningar: ändra"  on public.sparningar for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "egna sparningar: ta bort" on public.sparningar for delete using (auth.uid() = user_id);

-- Skydd mot orimligt stora sparningar (5 MB)
alter table public.sparningar add constraint sparning_storlek check (pg_column_size(data) < 5242880);
