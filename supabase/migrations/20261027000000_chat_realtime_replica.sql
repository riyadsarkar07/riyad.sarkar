-- Realtime INSERT/UPDATE on chat tables needs FULL replica identity
-- so RLS (is_admin / owner) can be evaluated for postgres_changes.

alter table public.chat_sessions replica identity full;
alter table public.chat_messages replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.chat_sessions;
  exception when duplicate_object then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_messages;
  exception when duplicate_object then
    null;
  end;
end $$;
