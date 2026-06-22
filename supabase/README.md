# Supabase Setup

MeetingMind uses Supabase for Google authentication, Postgres metadata, and private audio storage.

## Environment

Copy `.env.example` to `.env.local` and fill in:

* `NEXT_PUBLIC_SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not put a service role key in the browser app.

## Schema

Run `supabase/schema.sql` in the Supabase SQL editor or through the Supabase CLI after creating a project.

The schema includes:

* `meetings`
* `transcripts`
* `meeting_notes`
* `action_items`
* private `meeting-audio` storage bucket
* row level security policies scoped to `auth.uid()`

## Storage Path Convention

Audio files should be uploaded under:

```text
{user_id}/{meeting_id}/{file_name}
```

The storage policies rely on the first path segment matching the authenticated user's id.
