-- These tables are accessed only by authenticated application servers.
-- No client policies are intentional: browser roles have no direct access.
alter table public.invites enable row level security;
alter table public.sessions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.enrollments enable row level security;
alter table public.quizzes enable row level security;
alter table public.access_codes enable row level security;

revoke all on table public.invites, public.sessions, public.quiz_attempts,
  public.enrollments, public.quizzes, public.access_codes from public, anon, authenticated;
grant select, insert, update, delete on table public.invites, public.sessions,
  public.quiz_attempts, public.enrollments, public.quizzes, public.access_codes to service_role;

-- A single RPC locks the invite, checks its limits, consumes a use and,
-- optionally, creates the session. Any error rolls back the entire operation.
create or replace function public.consume_invite(
  p_code_hash text,
  p_code text,
  p_token_hash text default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_invite public.invites%rowtype;
  v_metadata public.access_codes%rowtype;
  v_now timestamptz;
  v_expires_at timestamptz;
  v_uses integer;
begin
  if p_code_hash is null or p_code is null or btrim(p_code) = ''
     or (p_token_hash is not null and p_token_hash !~ '^[0-9a-f]{64}$') then
    raise exception 'Invalid redemption parameters' using errcode = '22023';
  end if;

  select * into v_invite from public.invites
    where code_hash = p_code_hash for update;
  if not found then return null; end if;

  select * into v_metadata from public.access_codes
    where upper(btrim(code)) = upper(btrim(p_code))
    order by id limit 1 for update;

  v_now := clock_timestamp();
  v_uses := coalesce(v_invite.uses, 0);
  if (v_invite.expires_at is not null and v_invite.expires_at <= v_now)
     or (v_invite.max_uses > 0 and v_uses >= v_invite.max_uses)
     or (v_metadata.id is not null and (
       v_metadata.is_active is not true
       or v_metadata.course_id is distinct from v_invite.course_id
       or (v_metadata.expires_at is not null and v_metadata.expires_at <= v_now)
       or (v_metadata.max_uses > 0 and v_uses >= v_metadata.max_uses)
     )) then
    return null;
  end if;

  v_expires_at := least(v_now + interval '7 days', v_invite.expires_at, v_metadata.expires_at);
  update public.invites set
    uses = v_uses + 1,
    used_at = case
      when (v_invite.max_uses > 0 and v_uses + 1 >= v_invite.max_uses)
        or (v_metadata.max_uses > 0 and v_uses + 1 >= v_metadata.max_uses)
      then v_now else v_invite.used_at end
    where id = v_invite.id;

  if v_metadata.id is not null then
    update public.access_codes set current_uses = v_uses + 1, updated_date = v_now
      where id = v_metadata.id;
  end if;

  if p_token_hash is not null then
    insert into public.sessions (token_hash, course_id, expires_at)
      values (p_token_hash, v_invite.course_id, v_expires_at);
  end if;
  return jsonb_build_object('course_id', v_invite.course_id, 'expires_at', v_expires_at);
end;
$$;

revoke all on function public.consume_invite(text, text, text) from public, anon, authenticated;
grant execute on function public.consume_invite(text, text, text) to service_role;
