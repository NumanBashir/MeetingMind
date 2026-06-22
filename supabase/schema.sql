create extension if not exists "pgcrypto";

create type public.action_item_status as enum ('open', 'done');

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  duration_seconds integer not null default 0,
  language text not null,
  audio_path text,
  audio_mime_type text,
  audio_size_bytes bigint
);

create table public.transcripts (
  meeting_id uuid primary key references public.meetings(id) on delete cascade,
  content text not null default '',
  speaker_segments jsonb,
  updated_at timestamptz not null default now()
);

create table public.meeting_notes (
  meeting_id uuid primary key references public.meetings(id) on delete cascade,
  summary text,
  decisions text[] not null default '{}',
  topics text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  text text not null,
  status public.action_item_status not null default 'open',
  assignee text,
  created_at timestamptz not null default now()
);

create index meetings_user_created_at_idx
  on public.meetings (user_id, created_at desc);

create index action_items_meeting_id_idx
  on public.action_items (meeting_id);

alter table public.meetings enable row level security;
alter table public.transcripts enable row level security;
alter table public.meeting_notes enable row level security;
alter table public.action_items enable row level security;

create policy "Users can manage own meetings"
  on public.meetings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage transcripts for own meetings"
  on public.transcripts
  for all
  using (
    exists (
      select 1 from public.meetings
      where meetings.id = transcripts.meeting_id
        and meetings.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meetings
      where meetings.id = transcripts.meeting_id
        and meetings.user_id = auth.uid()
    )
  );

create policy "Users can manage notes for own meetings"
  on public.meeting_notes
  for all
  using (
    exists (
      select 1 from public.meetings
      where meetings.id = meeting_notes.meeting_id
        and meetings.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meetings
      where meetings.id = meeting_notes.meeting_id
        and meetings.user_id = auth.uid()
    )
  );

create policy "Users can manage action items for own meetings"
  on public.action_items
  for all
  using (
    exists (
      select 1 from public.meetings
      where meetings.id = action_items.meeting_id
        and meetings.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meetings
      where meetings.id = action_items.meeting_id
        and meetings.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('meeting-audio', 'meeting-audio', false)
on conflict (id) do nothing;

create policy "Users can read own meeting audio"
  on storage.objects
  for select
  using (
    bucket_id = 'meeting-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own meeting audio"
  on storage.objects
  for insert
  with check (
    bucket_id = 'meeting-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own meeting audio"
  on storage.objects
  for delete
  using (
    bucket_id = 'meeting-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
