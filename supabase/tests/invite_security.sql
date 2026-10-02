begin;
set local role service_role;
do $test$
declare
  v_id text := 'security-test-' || gen_random_uuid()::text;
  v_hash text := md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text);
  v_second_hash text := md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text);
  v_result jsonb;
  v_count integer;
begin
  insert into public.invites(code_hash,course_id,max_uses,uses)
    values(v_id,v_id,1,0);
  v_result := public.consume_invite(v_id,v_id,v_hash);
  if v_result->>'course_id' is distinct from v_id then raise exception 'Valid invite rejected'; end if;
  select count(*) into v_count from public.sessions where token_hash=v_hash;
  if v_count <> 1 then raise exception 'Session missing'; end if;
  if public.consume_invite(v_id,v_id,v_second_hash) is not null then raise exception 'Limit bypass'; end if;
  select uses into v_count from public.invites where code_hash=v_id;
  if v_count <> 1 then raise exception 'Incorrect usage count'; end if;

  update public.invites set uses=0,max_uses=2 where code_hash=v_id;
  begin
    perform public.consume_invite(v_id,v_id,v_hash);
    raise exception 'Duplicate session accepted';
  exception when unique_violation then null;
  end;
  select uses into v_count from public.invites where code_hash=v_id;
  if v_count <> 0 then raise exception 'Failed session consumed invite'; end if;

  insert into public.access_codes(id,code,course_id,is_active,max_uses,current_uses)
    values(v_id,upper(v_id),v_id,false,2,0);
  if public.consume_invite(v_id,v_id,null) is not null then raise exception 'Inactive code accepted'; end if;
  update public.access_codes set is_active=true,expires_at=now()-interval '1 minute' where id=v_id;
  if public.consume_invite(v_id,v_id,null) is not null then raise exception 'Expired metadata accepted'; end if;
  update public.access_codes set expires_at=now()+interval '1 hour',max_uses=1 where id=v_id;
  v_result := public.consume_invite(v_id,v_id,v_second_hash);
  if v_result is null then raise exception 'Reactivated code rejected'; end if;
  if (v_result->>'expires_at')::timestamptz > now()+interval '1 hour' then raise exception 'Session outlives invite'; end if;
  if public.consume_invite(v_id,v_id,null) is not null then raise exception 'Metadata limit bypass'; end if;
  select current_uses into v_count from public.access_codes where id=v_id;
  if v_count <> 1 then raise exception 'Metadata count not synchronized'; end if;

  update public.invites set uses=0,expires_at=now()-interval '1 minute' where code_hash=v_id;
  if public.consume_invite(v_id,v_id,null) is not null then raise exception 'Expired invite accepted'; end if;
  if public.consume_invite(v_id || '-missing',v_id,null) is not null then raise exception 'Missing invite accepted'; end if;
end
$test$;
reset role;
do $test$
declare
  v_role text;
  v_table text;
begin
  foreach v_role in array array['anon','authenticated'] loop
    if has_function_privilege(v_role,'public.consume_invite(text,text,text)','EXECUTE') then
      raise exception '% can consume invites directly', v_role;
    end if;
    foreach v_table in array array['invites','sessions','quiz_attempts','enrollments','quizzes','access_codes'] loop
      if has_table_privilege(v_role,'public.' || v_table,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
        raise exception '% retains privileges on %', v_role, v_table;
      end if;
    end loop;
  end loop;
end
$test$;
rollback;
-- Emit TAP so this file also works with supabase test db / pg_prove.
select '1..1' as security_test
union all
select 'ok 1 - limits, session rollback, inactive/expired codes, expiry cap, counters and client permissions';
