-- M.O.T.H.E.R AV_2663: run in Supabase SQL Editor on a new project.
-- Administrator must then SIGN UP at the website with the exact seeded email.
create extension if not exists pgcrypto;
create table if not exists public.allowed_users (
 email text primary key check(email=lower(email)),
 clearance_level int not null default 1 check(clearance_level between 1 and 5),
 role text not null default 'viewer' check(role in ('viewer','admin')),
 status text not null default 'active' check(status in ('active','suspended')),
 created_at timestamptz not null default now()
);
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text unique not null,
 clearance_level int not null check(clearance_level between 1 and 5),
 role text not null check(role in ('viewer','admin')),
 status text not null check(status in ('active','suspended')),
 created_at timestamptz not null default now()
);
create table if not exists public.documents (
 id uuid primary key default gen_random_uuid(),
 document_code text unique not null default '',
 category text not null check(category in ('FICHAS DE EMPLEADO','EXPEDIENTES','REGISTROS','CONFIDENCIAL','MISCELÁNEO')),
 title text not null,index_title text not null,author text,
 document_date date,clearance_level int not null default 1 check(clearance_level between 1 and 5),
 content text not null default '',extra jsonb not null default '{}'::jsonb,
 status text not null default 'published' check(status in ('published','draft','archived')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 created_by uuid references auth.users(id)
);
create table if not exists public.attachments (
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references public.documents(id) on delete cascade,
 path text unique not null,filename text not null,mime_type text,file_size bigint,
 created_at timestamptz not null default now()
);
create index if not exists documents_cat_index on public.documents(category,status,clearance_level);
create index if not exists attachments_doc_index on public.attachments(document_id);
insert into public.allowed_users(email,clearance_level,role,status)
 values ('nachofrrd123@gmail.com',5,'admin','active')
 on conflict(email) do update set clearance_level=5,role='admin',status='active';
-- Claims are sourced from DATABASE on EACH query rather than relying on JWT metadata.
create or replace function public.my_clearance() returns integer language sql stable security definer set search_path='' as $$
 select p.clearance_level from public.profiles p
 join public.allowed_users a on a.email=p.email
 where p.id=(select auth.uid()) and p.status='active' and a.status='active'
 and p.clearance_level=a.clearance_level
 limit 1
$$;
create or replace function public.my_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join public.allowed_users a on a.email=p.email
 where p.id=(select auth.uid()) and p.role='admin' and a.role='admin'
 and p.status='active' and a.status='active' and a.clearance_level=5 and p.clearance_level=5)
$$;
-- Whenever auth user registers, grant profile ONLY if already whitelisted.
create or replace function public.register_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare a record;
begin
 select * into a from public.allowed_users where email=lower(new.email);
 if found then
 insert into public.profiles(id,email,clearance_level,role,status)
 values (new.id,lower(new.email),a.clearance_level,a.role,a.status)
 on conflict(id) do update set email=excluded.email,clearance_level=excluded.clearance_level,role=excluded.role,status=excluded.status;
 end if;
 return new;
end $$;
drop trigger if exists on_auth_user_created_mother on auth.users;
create trigger on_auth_user_created_mother after insert on auth.users for each row execute function public.register_profile();
-- Maintain matching profiles when admin changes allowed users.
create or replace function public.sync_whitelist() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.profiles set clearance_level=new.clearance_level,role=new.role,status=new.status where email=new.email;
 insert into public.profiles(id,email,clearance_level,role,status)
 select u.id,new.email,new.clearance_level,new.role,new.status from auth.users u
 where lower(u.email)=new.email
 on conflict(id) do update set clearance_level=excluded.clearance_level,role=excluded.role,status=excluded.status;
 return new;
end $$;
drop trigger if exists whitelist_sync_mother on public.allowed_users;
create trigger whitelist_sync_mother after insert or update on public.allowed_users for each row execute function public.sync_whitelist();
-- Prevent downgrade of preconfigured root account.
create or replace function public.protect_root() returns trigger language plpgsql set search_path='' as $$
begin
 if old.email='nachofrrd123@gmail.com' then
  if tg_op='DELETE' then raise exception 'root administrator protected'; end if;
  if new.role<>'admin' or new.clearance_level<>5 or new.status<>'active' then raise exception 'root administrator protected'; end if;
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists protect_root_mother on public.allowed_users;
create trigger protect_root_mother before update or delete on public.allowed_users for each row execute function public.protect_root();
create or replace function public.prepare_document() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
 new.document_code := case new.category when 'FICHAS DE EMPLEADO' then 'EMP' when 'EXPEDIENTES' then 'EXP'
 when 'REGISTROS' then 'REG' when 'CONFIDENCIAL' then 'CNF' else 'MSC' end || '-' || upper(substr(replace(new.id::text,'-',''),1,8));
 new.created_by := auth.uid();
 end if;
 new.updated_at := now();return new;
end $$;
drop trigger if exists prepare_document_mother on public.documents;
create trigger prepare_document_mother before insert or update on public.documents for each row execute function public.prepare_document();
-- RLS
alter table public.allowed_users enable row level security;
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.attachments enable row level security;
create policy "allowed admins select" on public.allowed_users for select to authenticated using ((select public.my_admin()));
create policy "allowed admins insert" on public.allowed_users for insert to authenticated with check ((select public.my_admin()) and role='viewer');
create policy "allowed admins update" on public.allowed_users for update to authenticated using ((select public.my_admin())) with check ((select public.my_admin()) and role='viewer');
create policy "profile own or admin read" on public.profiles for select to authenticated using (id=(select auth.uid()) or (select public.my_admin()));
-- No direct profile mutations by clients.
create policy "doc authorized read" on public.documents for select to authenticated
 using ((select public.my_admin()) or (status='published' and clearance_level <= (select public.my_clearance())));
create policy "doc admin insert" on public.documents for insert to authenticated with check ((select public.my_admin()));
create policy "doc admin update" on public.documents for update to authenticated using ((select public.my_admin())) with check ((select public.my_admin()));
create policy "doc admin delete" on public.documents for delete to authenticated using ((select public.my_admin()));
create policy "attachments authorized read" on public.attachments for select to authenticated using (
 exists(select 1 from public.documents d where d.id=attachments.document_id));
create policy "attachments admin insert" on public.attachments for insert to authenticated with check ((select public.my_admin()));
create policy "attachments admin delete" on public.attachments for delete to authenticated using ((select public.my_admin()));
-- Private bucket, max 15MB, known mimetypes.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('mother-files','mother-files',false,15728640,array['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','text/csv','image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=false,file_size_limit=15728640;
-- Object key shape: DOCUMENT_UUID/RANDOM_UUID/FILENAME
create policy "mother file admin upload" on storage.objects for insert to authenticated with check (
 bucket_id='mother-files' and (select public.my_admin()) and
 exists (select 1 from public.documents d where d.id::text=(storage.foldername(name))[1]));
create policy "mother file authorized download" on storage.objects for select to authenticated using (
 bucket_id='mother-files' and exists (
 select 1 from public.attachments a join public.documents d on d.id=a.document_id
 where a.path=name and ((select public.my_admin()) or
 (d.status='published' and d.clearance_level <= (select public.my_clearance())))));
create policy "mother file admin delete" on storage.objects for delete to authenticated using (
 bucket_id='mother-files' and (select public.my_admin()));
-- SQL functions need execute granted only to logged-in users.
revoke all on function public.my_clearance() from public;
revoke all on function public.my_admin() from public;
grant execute on function public.my_clearance() to authenticated;
grant execute on function public.my_admin() to authenticated;
