-- Palt & pixel: sparningar per användare och spel
-- Kör i Supabase: SQL Editor → New query → klistra in → Run. Går att köra flera gånger.

create table if not exists public.sparningar (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  spel       text        not null check (spel ~ '^[a-z0-9-]{1,40}$'),
  data       jsonb       not null,
  sparad_at  timestamptz not null default now(),
  primary key (user_id, spel)
);

alter table public.sparningar enable row level security;

-- Varje användare ser och ändrar bara sina egna sparningar
drop policy if exists "egna sparningar: läsa" on public.sparningar;
create policy "egna sparningar: läsa"   on public.sparningar for select using (auth.uid() = user_id);
drop policy if exists "egna sparningar: skapa" on public.sparningar;
create policy "egna sparningar: skapa"  on public.sparningar for insert with check (auth.uid() = user_id);
drop policy if exists "egna sparningar: ändra" on public.sparningar;
create policy "egna sparningar: ändra"  on public.sparningar for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "egna sparningar: ta bort" on public.sparningar;
create policy "egna sparningar: ta bort" on public.sparningar for delete using (auth.uid() = user_id);

-- Skydd mot orimligt stora sparningar (5 MB)
alter table public.sparningar drop constraint if exists sparning_storlek;
alter table public.sparningar add constraint sparning_storlek check (pg_column_size(data) < 5242880);

-- Inloggade användare får använda tabellen (radsäkerheten ovan avgör vilka rader).
grant select, insert, update, delete on public.sparningar to authenticated;
