-- CORREÇÃO C29 — rode este arquivo no SQL Editor de um banco que JÁ tinha o
-- schema.sql aplicado (o schema.sql novo já inclui esta função).
create or replace function public.member_count(r public.rooms)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.room_members where room_id = r.id;
$$;

revoke all on function public.member_count(public.rooms) from public, anon;
grant execute on function public.member_count(public.rooms) to authenticated;

notify pgrst, 'reload schema';
