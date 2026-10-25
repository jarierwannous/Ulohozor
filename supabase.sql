-- Úlohozor v1 — spusti celý súbor v SQL Editore Supabase.
-- Oddelené názvy uz_* nezasahujú do tabuliek iných aplikácií.
begin;
create table if not exists public.uz_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.uz_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  subject text not null default 'Všeobecné', active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.uz_tasks (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.uz_topics(id),
  code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
  title text not null, body text not null, solution text not null default '',
  position integer not null default 0, created_at timestamptz not null default now(),
  unique(id,topic_id), check(code ~ '^[0-9A-F]{12}$')
);
create table if not exists public.uz_assignments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.uz_topics(id), task_id uuid not null,
  group_name text not null check(length(group_name) between 1 and 100),
  student_name text not null check(length(student_name) between 1 and 150),
  created_at timestamptz not null default now(),
  foreign key(task_id,topic_id) references public.uz_tasks(id,topic_id),
  unique(topic_id,group_name,student_name)
);
create index if not exists uz_tasks_topic_idx on public.uz_tasks(topic_id);
create index if not exists uz_assignments_topic_group_idx on public.uz_assignments(topic_id,group_name);
alter table public.uz_admins enable row level security;
alter table public.uz_topics enable row level security;
alter table public.uz_tasks enable row level security;
alter table public.uz_assignments enable row level security;
revoke all on public.uz_admins,public.uz_topics,public.uz_tasks,public.uz_assignments from anon,authenticated;
-- Správcov pridáva len vlastník projektu cez SQL Editor / Table Editor.
create or replace function public.uz_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.uz_admins where user_id=auth.uid());
$$;
revoke all on function public.uz_is_admin() from public,anon,authenticated;
grant execute on function public.uz_is_admin() to authenticated;
grant select on public.uz_topics,public.uz_tasks,public.uz_assignments to authenticated;
drop policy if exists uz_read_topics on public.uz_topics;
create policy uz_read_topics on public.uz_topics for select to authenticated using ((select public.uz_is_admin()));
drop policy if exists uz_read_tasks on public.uz_tasks;
create policy uz_read_tasks on public.uz_tasks for select to authenticated using ((select public.uz_is_admin()));
drop policy if exists uz_read_assignments on public.uz_assignments;
create policy uz_read_assignments on public.uz_assignments for select to authenticated using ((select public.uz_is_admin()));

-- Jediný anonymný vstup: presný kód -> iba verejné zadanie. Žiadne mená ani riešenie.
create or replace function public.uz_lookup(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('title',t.title,'body',t.body,'topic',s.title,'code',t.code)
  from public.uz_tasks t join public.uz_topics s on s.id=t.topic_id
  where t.code=upper(regexp_replace(p_code,'[^a-zA-Z0-9]','','g')) and s.active limit 1;
$$;
revoke all on function public.uz_lookup(text) from public,anon,authenticated;
grant execute on function public.uz_lookup(text) to anon,authenticated;

create or replace function public.uz_import(p_data jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid; item jsonb; idx integer:=0; count_tasks integer; generated text;
begin
  if not public.uz_is_admin() then raise exception 'Prístup je povolený iba administrátorovi.'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' or jsonb_typeof(p_data->'tasks') is distinct from 'array' then raise exception 'Neplatný formát JSON.'; end if;
  count_tasks:=jsonb_array_length(p_data->'tasks');
  if count_tasks<1 or count_tasks>300 or coalesce(length(trim(p_data->>'topic')),0) not between 1 and 200 then raise exception 'Zadajte názov témy a 1 až 300 úloh.'; end if;
  insert into public.uz_topics(title,subject) values(trim(p_data->>'topic'),left(coalesce(p_data->>'subject','Všeobecné'),100)) returning id into new_id;
  for item in select value from jsonb_array_elements(p_data->'tasks') loop
    if jsonb_typeof(item->'body') is distinct from 'string' or coalesce(length(trim(item->>'body')),0) not between 1 and 30000 or coalesce(length(item->>'solution'),0)>30000 then raise exception 'Úloha %: chýba zadanie alebo je príliš dlhé.',idx+1; end if;
    loop
      generated:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
      begin
        insert into public.uz_tasks(topic_id,code,title,body,solution,position)
        values(new_id,generated,left(coalesce(nullif(item->>'title',''),'Úloha '||(idx+1)),200),trim(item->>'body'),coalesce(item->>'solution',''),idx);
        exit;
      exception when unique_violation then null;
      end;
    end loop;
    idx:=idx+1;
  end loop;
  return new_id;
end;
$$;
revoke all on function public.uz_import(jsonb) from public,anon,authenticated;
grant execute on function public.uz_import(jsonb) to authenticated;

create or replace function public.uz_set_active(p_topic uuid,p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.uz_is_admin() then raise exception 'Prístup je povolený iba administrátorovi.'; end if;
  update public.uz_topics set active=p_active where id=p_topic;
  if not found then raise exception 'Téma neexistuje.'; end if;
end;
$$;
revoke all on function public.uz_set_active(uuid,boolean) from public,anon,authenticated;
grant execute on function public.uz_set_active(uuid,boolean) to authenticated;

create or replace function public.uz_assign(p_topic uuid,p_group text,p_names text[],p_strategy text default 'balanced') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n text; chosen uuid; existing public.uz_assignments%rowtype; out_rows jsonb:='[]'::jsonb; g text:=trim(p_group);
begin
  if not public.uz_is_admin() then raise exception 'Prístup je povolený iba administrátorovi.'; end if;
  if coalesce(length(g),0) not between 1 and 100 or coalesce(cardinality(p_names),0) not between 1 and 300 then raise exception 'Zadajte skupinu a 1 až 300 mien.'; end if;
  if p_strategy is null or p_strategy not in ('balanced','unique','random') then raise exception 'Neznámy režim losovania.'; end if;
  -- Serializácia losovaní pre tému zabráni duplicite pri súbežných požiadavkách.
  perform pg_advisory_xact_lock(hashtextextended(p_topic::text,0));
  if not exists(select 1 from public.uz_tasks where topic_id=p_topic) then raise exception 'Téma nemá úlohy.'; end if;
  for n in select distinct trim(x) from unnest(p_names) as u(x) order by trim(x) loop
    if coalesce(length(n),0) not between 1 and 150 then raise exception 'Neplatné meno žiaka.'; end if;
    select * into existing from public.uz_assignments where topic_id=p_topic and group_name=g and student_name=n;
    if not found then
      select t.id into chosen from public.uz_tasks t
      left join public.uz_assignments a on a.task_id=t.id and a.topic_id=p_topic and a.group_name=g
      where t.topic_id=p_topic group by t.id
      having p_strategy<>'unique' or count(a.id)=0
      order by case when p_strategy='balanced' then count(a.id) else 0 end,random() limit 1;
      if chosen is null then raise exception 'Nie je dosť voľných úloh. Zvoľte vyvážené rozdelenie. Nič sa nepriradilo.'; end if;
      insert into public.uz_assignments(topic_id,task_id,group_name,student_name) values(p_topic,chosen,g,n) returning * into existing;
    end if;
    out_rows:=out_rows||jsonb_build_array(to_jsonb(existing));
  end loop;
  return out_rows;
end;
$$;
revoke all on function public.uz_assign(uuid,text,text[],text) from public,anon,authenticated;
grant execute on function public.uz_assign(uuid,text,text[],text) to authenticated;
commit;

-- Po vytvorení učiteľského účtu v Authentication skopírujte jeho UUID a spustite:
-- insert into public.uz_admins(user_id) values ('SEM-VLOZTE-UUID-UZIVATELA') on conflict do nothing;
