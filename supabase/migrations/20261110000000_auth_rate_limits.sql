-- Counts failed sign-in and code-redemption attempts per client and window.
-- Only application servers (service_role) can read or write it.
create table if not exists public.auth_rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  failures integer not null default 0
);

alter table public.auth_rate_limits enable row level security;
revoke all on table public.auth_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.auth_rate_limits to service_role;

-- Returns the failures recorded for the key in the current window.
-- p_increment = 0 only reads; p_increment = 1 records one more failure.
create or replace function public.auth_rate_limit_hit(
  p_key text,
  p_window_seconds integer,
  p_increment integer default 0
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_failures integer;
begin
  if p_key is null or p_key = '' or p_window_seconds is null or p_window_seconds <= 0
     or p_increment is null or p_increment not in (0, 1) then
    raise exception 'Invalid rate limit parameters' using errcode = '22023';
  end if;

  if p_increment = 0 then
    select failures into v_failures from public.auth_rate_limits
      where key = p_key and window_start > v_now - make_interval(secs => p_window_seconds);
    return coalesce(v_failures, 0);
  end if;

  insert into public.auth_rate_limits as l (key, window_start, failures)
    values (p_key, v_now, 1)
  on conflict (key) do update set
    failures = case when l.window_start > v_now - make_interval(secs => p_window_seconds)
      then l.failures + 1 else 1 end,
    window_start = case when l.window_start > v_now - make_interval(secs => p_window_seconds)
      then l.window_start else v_now end
  returning failures into v_failures;

  delete from public.auth_rate_limits
    where window_start < v_now - interval '1 day';
  return v_failures;
end;
$$;

revoke all on function public.auth_rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.auth_rate_limit_hit(text, integer, integer) to service_role;
