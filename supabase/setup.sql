
create table if not exists public.team (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'trusted')),
  email text,
  added_at timestamptz not null default now()
);
alter table public.team enable row level security;

-- Returns the signed-in user's role, or null for everyone else.
create or replace function public.my_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.team where user_id = auth.uid()
$$;
grant execute on function public.my_role() to anon, authenticated;

drop policy if exists "team: read own row" on public.team;
create policy "team: read own row" on public.team
  for select to authenticated
  using (user_id = auth.uid() or public.my_role() = 'admin');


create table if not exists public.samples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  source text not null check (source in ('crowd', 'trusted')),
  project text check (project in ('grading', 'chemical')),          -- null for crowd uploads
  crop text not null check (crop in ('beans', 'banana', 'plantain', 'pawpaw')),
  photos jsonb not null,                                             -- [{"path": "...", "view": "Side"}]

  -- What anyone can see
  ripeness smallint check (ripeness between 1 and 6),                -- fruit only
  defects text[] not null default '{}',
  obtained_from text,                                                -- market, supermarket, farm, ...
  seller_claim text,                                                 -- weak hint only, never ground truth

  -- Trusted form only
  grade text check (grade in ('A', 'B', 'C', 'reject', 'unsure')),
  damaged_pct smallint check (damaged_pct between 0 and 100),
  treatment text,                                                    -- known-natural, known-carbide, ...
  hours_since_start numeric check (hours_since_start >= 0),
  lab_result text,
  signs text[] not null default '{}',
  sample_tag text,
  taken_at timestamptz,

  -- Context
  place text,
  town text,
  phone_model text,
  contributor text,                                                  -- nickname for credit
  device_id text,                                                    -- random id kept in the browser
  notes text,
  consent boolean not null,
  submitted_by uuid default auth.uid(),

  -- Review (admins only)
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  final_label text,
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid,

  constraint photos_is_array check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) between 1 and 8),
  constraint short_text check (
    coalesce(length(contributor), 0) <= 40 and coalesce(length(town), 0) <= 80 and
    coalesce(length(place), 0) <= 80 and coalesce(length(notes), 0) <= 1000 and
    coalesce(length(phone_model), 0) <= 60 and coalesce(length(sample_tag), 0) <= 40
  )
);
create index if not exists samples_created_idx on public.samples (created_at desc);
create index if not exists samples_status_idx on public.samples (review_status);
alter table public.samples enable row level security;

-- Anyone (no login) can add a crowd sample. They cannot set review fields or "known" treatment labels.
drop policy if exists "samples: crowd insert" on public.samples;
create policy "samples: crowd insert" on public.samples
  for insert to anon, authenticated
  with check (
    source = 'crowd' and project is null and consent = true
    and treatment is null and lab_result is null and grade is null and hours_since_start is null
    and review_status = 'pending' and final_label is null and review_note is null
    and reviewed_at is null and reviewed_by is null
    and submitted_by is not distinct from auth.uid()
  );

-- Team members (admin or trusted) can add full trusted samples.
drop policy if exists "samples: trusted insert" on public.samples;
create policy "samples: trusted insert" on public.samples
  for insert to authenticated
  with check (
    source = 'trusted' and project is not null and consent = true
    and public.my_role() in ('admin', 'trusted')
    and review_status = 'pending' and final_label is null and reviewed_at is null and reviewed_by is null
    and submitted_by = auth.uid()
  );

-- Admins read everything; trusted members read their own rows.
drop policy if exists "samples: read" on public.samples;
create policy "samples: read" on public.samples
  for select to authenticated
  using (public.my_role() = 'admin' or submitted_by = auth.uid());

-- Only admins review, edit or delete.
drop policy if exists "samples: admin update" on public.samples;
create policy "samples: admin update" on public.samples
  for update to authenticated
  using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');

drop policy if exists "samples: admin delete" on public.samples;
create policy "samples: admin delete" on public.samples
  for delete to authenticated
  using (public.my_role() = 'admin');

-- ============================================================
-- 3. Public numbers: leaderboard and totals (no private details exposed)
-- ============================================================
create or replace function public.leaderboard()
returns table (contributor text, uploads bigint)
language sql stable security definer
set search_path = public
as $$
  select s.contributor, count(*) as uploads
  from public.samples s
  where s.source = 'crowd' and coalesce(trim(s.contributor), '') <> '' and s.review_status <> 'rejected'
  group by s.contributor
  order by uploads desc, s.contributor
  limit 20
$$;

create or replace function public.public_stats()
returns json
language sql stable security definer
set search_path = public
as $$
  select json_build_object(
    'samples', count(*),
    'beans', count(*) filter (where crop = 'beans'),
    'banana', count(*) filter (where crop = 'banana'),
    'plantain', count(*) filter (where crop = 'plantain'),
    'pawpaw', count(*) filter (where crop = 'pawpaw')
  )
  from public.samples
  where review_status <> 'rejected'
$$;

grant execute on function public.leaderboard() to anon, authenticated;
grant execute on function public.public_stats() to anon, authenticated;


insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produce', 'produce', false, 4194304, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update
  set public = false, file_size_limit = 4194304, allowed_mime_types = array['image/jpeg', 'image/webp', 'image/png'];

drop policy if exists "produce: crowd upload" on storage.objects;
create policy "produce: crowd upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'produce' and (storage.foldername(name))[1] = 'crowd');

drop policy if exists "produce: trusted upload" on storage.objects;
create policy "produce: trusted upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'produce' and (storage.foldername(name))[1] = 'trusted'
              and public.my_role() in ('admin', 'trusted'));

drop policy if exists "produce: admin read" on storage.objects;
create policy "produce: admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'produce' and public.my_role() = 'admin');

drop policy if exists "produce: admin delete" on storage.objects;
create policy "produce: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'produce' and public.my_role() = 'admin');

