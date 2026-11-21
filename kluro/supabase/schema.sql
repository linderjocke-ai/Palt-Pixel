-- Kluro på paltpixel.se. Flyttat från skolvy.se (lektionsvy drizzle 0003–0006).
-- Bara rum-läget (kr_*) används här; skolvys gamla globala läge (fs_register m.fl.) är borttaget.
create table if not exists public.fs_config (id text primary key default 'main', data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
grant all on public.fs_config to service_role;
create table if not exists public.fs_weeks (week text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
grant all on public.fs_weeks to service_role;
create table if not exists public.fs_secrets (key text primary key, hash text not null);
revoke all on public.fs_secrets from public, anon, authenticated; grant all on public.fs_secrets to service_role;
alter table public.fs_config enable row level security;
alter table public.fs_weeks enable row level security;
alter table public.fs_secrets enable row level security;
create or replace function public.fs_hash(t text) returns text language sql immutable set search_path=public as $$ select encode(sha256(convert_to(coalesce(t,''),'UTF8')),'hex') $$;
revoke execute on function public.fs_hash(text) from public, anon, authenticated;
create table public.kluro_rooms (code text primary key check (code ~ '^\d{6}$'), name text not null, created_at timestamptz not null default now());
grant all on public.kluro_rooms to service_role;
create table public.kluro_room_weeks (room text not null references public.kluro_rooms(code) on delete cascade, week text not null, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), primary key(room, week));
grant all on public.kluro_room_weeks to service_role;
create table public.kluro_room_players (id uuid primary key default gen_random_uuid(), room text not null references public.kluro_rooms(code) on delete cascade, nick text not null, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index kluro_room_players_nick on public.kluro_room_players(room, lower(nick));
grant all on public.kluro_room_players to service_role;
alter table public.kluro_rooms enable row level security;
alter table public.kluro_room_weeks enable row level security;
alter table public.kluro_room_players enable row level security;

create or replace function public.kr_admin_ok(p_room text, p_pin text) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.fs_secrets where key='room:'||p_room and hash=public.fs_hash(p_pin)) $$;
revoke execute on function public.kr_admin_ok(text,text) from public, anon, authenticated;
create or replace function public.kr_require_admin(p_room text, p_pin text) returns void language plpgsql security definer set search_path=public as $$ begin if not public.kr_admin_ok(p_room,p_pin) then perform pg_sleep(1); raise exception 'bad_pin'; end if; end $$;
revoke execute on function public.kr_require_admin(text,text) from public, anon, authenticated;

create or replace function public.kr_create_room(p_name text, p_pin text) returns json language plpgsql security definer set search_path=public as $$
declare v_name text:=left(btrim(coalesce(p_name,'')),60); v_code text; i int:=0;
begin
  if char_length(v_name)<2 then raise exception 'bad_name'; end if;
  if char_length(coalesce(p_pin,''))<6 then raise exception 'short_pin'; end if;
  if (select count(*) from public.kluro_rooms where created_at > now()-interval '1 minute') > 20 then raise exception 'rate_limited'; end if;
  loop
    i:=i+1; v_code:=lpad((floor(random()*900000)+100000)::int::text,6,'0');
    begin insert into public.kluro_rooms(code,name) values(v_code,v_name); exit; exception when unique_violation then if i>20 then raise exception 'no_code'; end if; end;
  end loop;
  insert into public.fs_secrets(key,hash) values('room:'||v_code, public.fs_hash(p_pin));
  return json_build_object('code',v_code,'name',v_name);
end $$;

create or replace function public.kr_load(p_room text) returns json language sql stable security definer set search_path=public as $$
  select json_build_object(
    'room', (select json_build_object('code',code,'name',name) from public.kluro_rooms where code=p_room),
    'config', (select data from public.fs_config where id='room:'||p_room),
    'weeks', coalesce((select json_object_agg(week,data) from public.kluro_room_weeks where room=p_room),'{}'::json),
    'players', coalesce((select json_agg(json_build_object('id',id,'nick',nick,'data',data)) from public.kluro_room_players where room=p_room),'[]'::json))
$$;

create or replace function public.kr_register(p_room text, p_nick text) returns json language plpgsql security definer set search_path=public as $$ declare v_nick text:=regexp_replace(btrim(coalesce(p_nick,'')),'\s+',' ','g'); v_id uuid; v_code text:=''; i int; begin if not exists(select 1 from public.kluro_rooms where code=p_room) then raise exception 'no_room'; end if; if char_length(v_nick)<2 or char_length(v_nick)>24 then raise exception 'bad_nick'; end if; for i in 1..6 loop v_code:=v_code||substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',1+floor(random()*32)::int,1); end loop; begin insert into public.kluro_room_players(room,nick) values(p_room,v_nick) returning id into v_id; exception when unique_violation then raise exception 'nick_taken'; end; insert into public.fs_secrets(key,hash) values('rplayer:'||v_id::text,public.fs_hash(v_code)); return json_build_object('id',v_id,'code',v_code,'nick',v_nick); end $$;
create or replace function public.kr_login(p_room text, p_nick text, p_code text) returns json language plpgsql security definer set search_path=public as $$ declare v_p public.kluro_room_players; v_code text:=upper(btrim(coalesce(p_code,''))); begin select * into v_p from public.kluro_room_players where room=p_room and lower(nick)=lower(regexp_replace(btrim(coalesce(p_nick,'')),'\s+',' ','g')); if v_p.id is null or not exists(select 1 from public.fs_secrets where key='rplayer:'||v_p.id::text and hash=public.fs_hash(v_code)) then perform pg_sleep(1); raise exception 'bad_login'; end if; return json_build_object('id',v_p.id,'code',v_code,'nick',v_p.nick); end $$;
create or replace function public.kr_save_player(p_id uuid, p_code text, p_data jsonb) returns void language plpgsql security definer set search_path=public as $$ begin if not exists(select 1 from public.fs_secrets where key='rplayer:'||p_id::text and hash=public.fs_hash(upper(btrim(coalesce(p_code,''))))) then raise exception 'bad_login'; end if; if jsonb_typeof(p_data) is distinct from 'object' or pg_column_size(p_data)>200000 then raise exception 'bad_data'; end if; update public.kluro_room_players set data=p_data,updated_at=now() where id=p_id; end $$;
create or replace function public.kr_admin_login(p_room text, p_pin text) returns text language plpgsql security definer set search_path=public as $$ begin perform public.kr_require_admin(p_room,p_pin); return 'ok'; end $$;
create or replace function public.kr_admin_verify(p_room text, p_pin text) returns boolean language plpgsql security definer set search_path=public as $$ begin if public.kr_admin_ok(p_room,p_pin) then return true; end if; perform pg_sleep(1); return false; end $$;
create or replace function public.kr_admin_set_pin(p_room text, p_pin text, p_new text) returns void language plpgsql security definer set search_path=public as $$ begin perform public.kr_require_admin(p_room,p_pin); if char_length(coalesce(p_new,''))<6 then raise exception 'short_pin'; end if; update public.fs_secrets set hash=public.fs_hash(p_new) where key='room:'||p_room; end $$;
create or replace function public.kr_admin_save_config(p_room text, p_pin text, p_data jsonb) returns void language plpgsql security definer set search_path=public as $$ begin perform public.kr_require_admin(p_room,p_pin); if pg_column_size(p_data)>200000 then raise exception 'bad_data'; end if; insert into public.fs_config(id,data,updated_at) values('room:'||p_room,p_data,now()) on conflict(id) do update set data=excluded.data,updated_at=now(); end $$;
create or replace function public.kr_admin_save_week(p_room text, p_pin text, p_week text, p_data jsonb) returns void language plpgsql security definer set search_path=public as $$ begin perform public.kr_require_admin(p_room,p_pin); if p_week !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'bad_week'; end if; insert into public.kluro_room_weeks(room,week,data,updated_at) values(p_room,p_week,p_data,now()) on conflict(room,week) do update set data=excluded.data,updated_at=now(); end $$;
create or replace function public.kr_admin_delete_player(p_room text, p_pin text, p_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin perform public.kr_require_admin(p_room,p_pin); delete from public.kluro_room_players where id=p_id and room=p_room; delete from public.fs_secrets where key='rplayer:'||p_id::text; end $$;

revoke execute on function public.kr_create_room(text,text), public.kr_load(text), public.kr_register(text,text), public.kr_login(text,text,text), public.kr_save_player(uuid,text,jsonb), public.kr_admin_login(text,text), public.kr_admin_verify(text,text), public.kr_admin_set_pin(text,text,text), public.kr_admin_save_config(text,text,jsonb), public.kr_admin_save_week(text,text,text,jsonb), public.kr_admin_delete_player(text,text,uuid) from public;
grant execute on function public.kr_create_room(text,text), public.kr_load(text), public.kr_register(text,text), public.kr_login(text,text,text), public.kr_save_player(uuid,text,jsonb), public.kr_admin_login(text,text), public.kr_admin_verify(text,text), public.kr_admin_set_pin(text,text,text), public.kr_admin_save_config(text,text,jsonb), public.kr_admin_save_week(text,text,text,jsonb), public.kr_admin_delete_player(text,text,uuid) to anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.kn_get(p_room text, p_week text)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select json_build_object(
    'config', (select data from public.fs_config where id = case when p_room is null then 'main' else 'room:'||p_room end),
    'news', case when p_room is null then (select data->'news' from public.fs_weeks where week=p_week)
                 else (select data->'news' from public.kluro_room_weeks where room=p_room and week=p_week) end)
$$;

CREATE OR REPLACE FUNCTION public.kn_save_news(p_room text, p_week text, p_news jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare v_old jsonb;
begin
  if p_week !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'bad_week'; end if;
  if jsonb_typeof(p_news->'questions') is distinct from 'array' or pg_column_size(p_news) > 50000 then raise exception 'bad_data'; end if;
  if p_room is null then
    select data->'news' into v_old from public.fs_weeks where week=p_week;
    if v_old is not null and jsonb_array_length(coalesce(v_old->'questions','[]'::jsonb)) > 0 then return v_old; end if;
    insert into public.fs_weeks(week,data,updated_at) values(p_week, jsonb_build_object('news',p_news), now())
      on conflict(week) do update set data = public.fs_weeks.data || jsonb_build_object('news',p_news), updated_at=now();
  else
    if not exists(select 1 from public.kluro_rooms where code=p_room) then raise exception 'no_room'; end if;
    select data->'news' into v_old from public.kluro_room_weeks where room=p_room and week=p_week;
    if v_old is not null and jsonb_array_length(coalesce(v_old->'questions','[]'::jsonb)) > 0 then return v_old; end if;
    insert into public.kluro_room_weeks(room,week,data,updated_at) values(p_room,p_week, jsonb_build_object('news',p_news), now())
      on conflict(room,week) do update set data = public.kluro_room_weeks.data || jsonb_build_object('news',p_news), updated_at=now();
  end if;
  return p_news;
end $$;

REVOKE EXECUTE ON FUNCTION public.kn_get(text,text), public.kn_save_news(text,text,jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kn_get(text,text), public.kn_save_news(text,text,jsonb) TO service_role;