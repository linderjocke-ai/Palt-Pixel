-- Palt & pixel + Veckopalten: allt i ett. Kör i Supabase: SQL Editor → klistra in → Run.
-- Går att köra flera gånger.

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


-- Veckopalten – databasschema för Supabase
-- Kör hela filen i Supabase: SQL Editor → New query → klistra in → Run.
-- Filen går att köra flera gånger.

create extension if not exists pgcrypto;

-- ---------- Tabeller ----------

create table if not exists familjer (
  id uuid primary key default gen_random_uuid(),
  namn text not null check (char_length(namn) between 1 and 60),
  familjekod text not null unique,          -- barnen loggar in med denna + PIN
  vuxenkod text not null unique,            -- bjuder in fler vuxna
  skapad_at timestamptz not null default now()
);

create table if not exists barn (
  id uuid primary key default gen_random_uuid(),
  familj_id uuid not null references familjer(id) on delete cascade,
  namn text not null check (char_length(namn) between 1 and 40),
  farg text not null default '#2F6FD0',
  arskurs text,
  kommun text,
  skola text,
  skapad_at timestamptz not null default now()
);

-- PIN-koder ligger i en egen tabell som ingen kan läsa direkt.
create table if not exists barn_pin (
  barn_id uuid primary key references barn(id) on delete cascade,
  pin_hash text not null
);

create table if not exists medlemmar (
  id uuid primary key default gen_random_uuid(),
  familj_id uuid not null references familjer(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  roll text not null check (roll in ('foralder','barn')),
  barn_id uuid references barn(id) on delete cascade,
  namn text,
  tema text not null default 'soluppgang' check (tema in ('soluppgang','kickflip','setter')),
  skapad_at timestamptz not null default now(),
  unique (familj_id, user_id),
  check ((roll = 'barn') = (barn_id is not null))
);

create table if not exists handelser (
  id uuid primary key default gen_random_uuid(),
  familj_id uuid not null references familjer(id) on delete cascade,
  barn_id uuid references barn(id) on delete cascade,   -- null = hela familjen (t.ex. lov)
  typ text not null check (typ in ('prov','laxa','traning','lov','ovrigt')),
  titel text not null check (char_length(titel) between 1 and 120),
  amne text,
  beskrivning text check (char_length(beskrivning) <= 4000),
  datum date not null,
  tid time,
  slut_datum date,
  upprepa text not null default 'ingen' check (upprepa in ('ingen','vecka')),
  upprepa_till date,
  skapad_av uuid references auth.users(id) on delete set null,
  skapad_at timestamptz not null default now()
);
create index if not exists handelser_familj_datum on handelser (familj_id, datum);

create table if not exists material (
  id uuid primary key default gen_random_uuid(),
  familj_id uuid not null references familjer(id) on delete cascade,
  handelse_id uuid not null references handelser(id) on delete cascade,
  typ text not null check (typ in ('lank','text','bild','fil')),
  titel text not null check (char_length(titel) between 1 and 160),
  url text,
  innehall text check (char_length(innehall) <= 20000),
  fil_sokvag text,
  skapad_av uuid references auth.users(id) on delete set null,
  skapad_av_namn text,
  skapad_at timestamptz not null default now()
);

create table if not exists resultat (
  handelse_id uuid primary key references handelser(id) on delete cascade,
  familj_id uuid not null references familjer(id) on delete cascade,
  poang numeric,
  max_poang numeric,
  kommentar text check (char_length(kommentar) <= 1000),
  uppdaterad_at timestamptz not null default now()
);

create table if not exists lektioner (
  id uuid primary key default gen_random_uuid(),
  familj_id uuid not null references familjer(id) on delete cascade,
  barn_id uuid not null references barn(id) on delete cascade,
  veckodag int not null check (veckodag between 1 and 7),
  start time not null,
  slut time not null,
  amne text not null
);

create table if not exists pin_forsok (
  user_id uuid not null,
  barn_id uuid,
  tid timestamptz not null default now()
);
alter table pin_forsok add column if not exists barn_id uuid;

-- ---------- Hjälpfunktioner ----------

create or replace function ar_medlem(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from medlemmar where familj_id = f and user_id = auth.uid());
$$;

create or replace function ar_foralder(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from medlemmar where familj_id = f and user_id = auth.uid() and roll = 'foralder');
$$;

create or replace function mitt_barn(f uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select barn_id from medlemmar where familj_id = f and user_id = auth.uid() and roll = 'barn' limit 1;
$$;

-- Får användaren se/ändra saker som hör till ett visst barn (null = hela familjen)?
create or replace function far_se(f uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select ar_foralder(f) or (ar_medlem(f) and (b is null or b = mitt_barn(f)));
$$;

create or replace function far_skriva(f uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select ar_foralder(f) or (b is not null and b = mitt_barn(f));
$$;

create or replace function ny_kod(langd int) returns text
language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, langd);
$$;

-- ---------- Radsäkerhet (RLS) ----------

alter table familjer enable row level security;
alter table barn enable row level security;
alter table barn_pin enable row level security;
alter table medlemmar enable row level security;
alter table handelser enable row level security;
alter table material enable row level security;
alter table resultat enable row level security;
alter table lektioner enable row level security;
alter table pin_forsok enable row level security;

drop policy if exists "se familj" on familjer;
create policy "se familj" on familjer for select using (ar_medlem(id));
drop policy if exists "andra familj" on familjer;
create policy "andra familj" on familjer for update using (ar_foralder(id)) with check (ar_foralder(id));

drop policy if exists "se barn" on barn;
create policy "se barn" on barn for select using (far_se(familj_id, id));
drop policy if exists "skapa barn" on barn;
create policy "skapa barn" on barn for insert with check (ar_foralder(familj_id));
drop policy if exists "andra barn" on barn;
create policy "andra barn" on barn for update using (ar_foralder(familj_id)) with check (ar_foralder(familj_id));
drop policy if exists "ta bort barn" on barn;
create policy "ta bort barn" on barn for delete using (ar_foralder(familj_id));

drop policy if exists "se medlemmar" on medlemmar;
create policy "se medlemmar" on medlemmar for select using (user_id = auth.uid() or ar_foralder(familj_id));
drop policy if exists "andra eget tema" on medlemmar;
drop policy if exists "andra medlemmar" on medlemmar;
create policy "andra medlemmar" on medlemmar for update using (ar_foralder(familj_id)) with check (ar_foralder(familj_id));
-- Egna utseendet byts via funktionen satt_tema, så att ingen kan ändra sin egen roll.
drop policy if exists "ta bort medlem" on medlemmar;
create policy "ta bort medlem" on medlemmar for delete using (ar_foralder(familj_id));

drop policy if exists "se handelser" on handelser;
create policy "se handelser" on handelser for select using (far_se(familj_id, barn_id));
drop policy if exists "skapa handelser" on handelser;
create policy "skapa handelser" on handelser for insert with check (far_skriva(familj_id, barn_id));
drop policy if exists "andra handelser" on handelser;
create policy "andra handelser" on handelser for update using (far_skriva(familj_id, barn_id)) with check (far_skriva(familj_id, barn_id));
drop policy if exists "ta bort handelser" on handelser;
create policy "ta bort handelser" on handelser for delete using (ar_foralder(familj_id));

drop policy if exists "se material" on material;
create policy "se material" on material for select using (exists (select 1 from handelser h where h.id = handelse_id and far_se(h.familj_id, h.barn_id)));
drop policy if exists "skapa material" on material;
create policy "skapa material" on material for insert with check (exists (select 1 from handelser h where h.id = handelse_id and h.familj_id = material.familj_id and (ar_foralder(h.familj_id) or (h.barn_id = mitt_barn(h.familj_id)))));
drop policy if exists "andra material" on material;
create policy "andra material" on material for update using (exists (select 1 from handelser h where h.id = handelse_id and far_skriva(h.familj_id, h.barn_id)));
drop policy if exists "ta bort material" on material;
create policy "ta bort material" on material for delete using (ar_foralder(familj_id));

drop policy if exists "se resultat" on resultat;
create policy "se resultat" on resultat for select using (exists (select 1 from handelser h where h.id = handelse_id and far_se(h.familj_id, h.barn_id)));
drop policy if exists "skapa resultat" on resultat;
create policy "skapa resultat" on resultat for insert with check (exists (select 1 from handelser h where h.id = handelse_id and h.familj_id = resultat.familj_id and far_skriva(h.familj_id, h.barn_id)));
drop policy if exists "andra resultat" on resultat;
create policy "andra resultat" on resultat for update using (exists (select 1 from handelser h where h.id = handelse_id and far_skriva(h.familj_id, h.barn_id)));
drop policy if exists "ta bort resultat" on resultat;
create policy "ta bort resultat" on resultat for delete using (ar_foralder(familj_id));

drop policy if exists "se lektioner" on lektioner;
create policy "se lektioner" on lektioner for select using (far_se(familj_id, barn_id));
drop policy if exists "skapa lektioner" on lektioner;
create policy "skapa lektioner" on lektioner for insert with check (ar_foralder(familj_id));
drop policy if exists "andra lektioner" on lektioner;
create policy "andra lektioner" on lektioner for update using (ar_foralder(familj_id));
drop policy if exists "ta bort lektioner" on lektioner;
create policy "ta bort lektioner" on lektioner for delete using (ar_foralder(familj_id));
-- barn_pin och pin_forsok har inga policys: bara funktionerna nedan når dem.

-- ---------- Funktioner som appen anropar ----------

-- Skapa en familj; den inloggade blir förälder.
create or replace function skapa_familj(familjenamn text, mitt_namn text) returns uuid
language plpgsql security definer set search_path = public as $$
declare f uuid;
begin
  if auth.uid() is null then raise exception 'Inte inloggad'; end if;
  insert into familjer (namn, familjekod, vuxenkod) values (familjenamn, ny_kod(6), ny_kod(8)) returning id into f;
  insert into medlemmar (familj_id, user_id, roll, namn) values (f, auth.uid(), 'foralder', mitt_namn);
  return f;
end $$;

-- En vuxen går med i en befintlig familj med vuxenkoden.
create or replace function ga_med_som_vuxen(kod text, mitt_namn text) returns uuid
language plpgsql security definer set search_path = public as $$
declare f uuid;
begin
  if auth.uid() is null then raise exception 'Inte inloggad'; end if;
  select id into f from familjer where vuxenkod = upper(trim(kod));
  if f is null then raise exception 'Fel kod'; end if;
  insert into medlemmar (familj_id, user_id, roll, namn) values (f, auth.uid(), 'foralder', mitt_namn)
    on conflict (familj_id, user_id) do nothing;
  return f;
end $$;

-- Förälder sätter ett barns PIN (4–6 siffror).
create or replace function satt_pin(b uuid, pin text) returns void
language plpgsql security definer set search_path = public as $$
declare f uuid;
begin
  select familj_id into f from barn where id = b;
  if f is null or not ar_foralder(f) then raise exception 'Ingen behörighet'; end if;
  if pin !~ '^[0-9]{4,6}$' then raise exception 'PIN ska vara 4–6 siffror'; end if;
  insert into barn_pin (barn_id, pin_hash) values (b, crypt(pin, gen_salt('bf')))
    on conflict (barn_id) do update set pin_hash = excluded.pin_hash;
end $$;

-- Visa barnens namn för en familjekod (för inloggningsskärmen).
create or replace function barn_for_kod(kod text) returns table (id uuid, namn text, farg text)
language sql stable security definer set search_path = public as $$
  select b.id, b.namn, b.farg from barn b join familjer f on f.id = b.familj_id
  where f.familjekod = upper(trim(kod)) order by b.namn;
$$;

-- Ett barn loggar in: anonym session + familjekod + PIN.
create or replace function ga_med_som_barn(kod text, b uuid, pin text) returns uuid
language plpgsql security definer set search_path = public as $$
declare f uuid; h text; antal int;
begin
  if auth.uid() is null then raise exception 'Inte inloggad'; end if;
  -- Spärr: 5 försök per enhet och 10 per barn inom 15 minuter.
  select count(*) into antal from pin_forsok where user_id = auth.uid() and tid > now() - interval '15 minutes';
  if antal >= 5 then raise exception 'För många försök. Vänta 15 minuter.'; end if;
  select count(*) into antal from pin_forsok where barn_id = b and tid > now() - interval '15 minutes';
  if antal >= 10 then raise exception 'För många försök. Vänta 15 minuter.'; end if;
  insert into pin_forsok (user_id, barn_id) values (auth.uid(), b);
  select fa.id into f from familjer fa join barn ba on ba.familj_id = fa.id
    where fa.familjekod = upper(trim(kod)) and ba.id = b;
  -- Fel kod eller PIN ger null (inget fel), så att försöket ovan sparas och räknas.
  if f is null then return null; end if;
  select pin_hash into h from barn_pin where barn_id = b;
  if h is null or h <> crypt(pin, h) then return null; end if;
  insert into medlemmar (familj_id, user_id, roll, barn_id, namn)
    select f, auth.uid(), 'barn', b, namn from barn where id = b
    on conflict (familj_id, user_id) do nothing;
  delete from pin_forsok where user_id = auth.uid() or barn_id = b;
  return f;
end $$;

-- Byt sitt eget utseende.
create or replace function satt_tema(t text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if t not in ('soluppgang','kickflip','setter') then raise exception 'Okänt utseende'; end if;
  update medlemmar set tema = t where user_id = auth.uid();
end $$;

-- Förälder skapar nya koder (t.ex. om familjekoden spridits).
create or replace function nya_koder(f uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not ar_foralder(f) then raise exception 'Ingen behörighet'; end if;
  update familjer set familjekod = ny_kod(6), vuxenkod = ny_kod(8) where id = f;
end $$;

-- Koderna syns bara för föräldrar.
create or replace function familjekoder(f uuid) returns table (familjekod text, vuxenkod text)
language sql stable security definer set search_path = public as $$
  select familjekod, vuxenkod from familjer where id = f and ar_foralder(f);
$$;

revoke all on function skapa_familj(text, text) from public, anon;
revoke all on function ga_med_som_vuxen(text, text) from public, anon;
revoke all on function satt_pin(uuid, text) from public, anon;
revoke all on function ga_med_som_barn(text, uuid, text) from public, anon;
revoke all on function nya_koder(uuid) from public, anon;
revoke all on function satt_tema(text) from public, anon;
revoke all on function familjekoder(uuid) from public, anon;
grant execute on function skapa_familj(text, text) to authenticated;
grant execute on function ga_med_som_vuxen(text, text) to authenticated;
grant execute on function satt_pin(uuid, text) to authenticated;
grant execute on function ga_med_som_barn(text, uuid, text) to authenticated;
grant execute on function nya_koder(uuid) to authenticated;
grant execute on function satt_tema(text) to authenticated;
grant execute on function familjekoder(uuid) to authenticated;
grant execute on function barn_for_kod(text) to anon, authenticated;

-- Inloggade användare får använda tabellerna; radsäkerheten avgör vilka rader.
grant select, insert, update, delete on barn, medlemmar, handelser, material, resultat, lektioner to authenticated;
grant update (namn) on familjer to authenticated;

-- Koderna i familjer ska inte kunna läsas direkt, bara via familjekoder().
revoke select on familjer from authenticated, anon;
grant select (id, namn, skapad_at) on familjer to authenticated;

-- ---------- Filer (bilder och dokument som instuderingsmaterial) ----------
-- Privat bucket "material". Sökväg: <familj_id>/<handelse_id>/<filnamn>.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
      values ('material', 'material', false, 15728640)
      on conflict (id) do nothing;

    drop policy if exists "vp las filer" on storage.objects;
    create policy "vp las filer" on storage.objects for select
      using (bucket_id = 'material' and ar_medlem(((storage.foldername(name))[1])::uuid));
    drop policy if exists "vp ladda upp filer" on storage.objects;
    create policy "vp ladda upp filer" on storage.objects for insert
      with check (bucket_id = 'material' and ar_medlem(((storage.foldername(name))[1])::uuid));
    drop policy if exists "vp ta bort filer" on storage.objects;
    create policy "vp ta bort filer" on storage.objects for delete
      using (bucket_id = 'material' and ar_foralder(((storage.foldername(name))[1])::uuid));
  end if;
end $$;
