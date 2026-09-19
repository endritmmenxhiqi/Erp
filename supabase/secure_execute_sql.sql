-- Harden the AI reporting RPC used by /api/chat-db.
-- It intentionally supports only bounded read queries and runs with caller privileges,
-- so existing RLS policies still decide which rows a user may read.
create or replace function public.execute_sql(query text)
returns jsonb
language plpgsql
security invoker
set statement_timeout = '3000ms'
set search_path = public
as $$
declare
  cleaned text := btrim(regexp_replace(query, ';+\s*$', ''));
  result jsonb;
begin
  if cleaned !~* '^\s*(select|with)\s+' then
    raise exception 'Only SELECT queries are allowed';
  end if;

  if cleaned ~ ';|--|/\*' then
    raise exception 'Multiple statements and comments are not allowed';
  end if;

  if cleaned ~* '\m(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|call|execute|merge|vacuum|analyze|listen|notify|set|reset)\M' then
    raise exception 'Query contains a forbidden operation';
  end if;

  if cleaned !~* '\mlimit\s+\d+\M' then
    cleaned := cleaned || ' limit 100';
  end if;

  execute format(
    'select coalesce(jsonb_agg(row_to_json(q)), ''[]''::jsonb) from (%s) q',
    cleaned
  )
  into result;

  return result;
end;
$$;

revoke all on function public.execute_sql(text) from public;
grant execute on function public.execute_sql(text) to authenticated;
