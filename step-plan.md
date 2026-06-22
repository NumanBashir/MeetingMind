# MeetingMind Step Plan

This plan turns `masterplan.md` into an implementation sequence. Each step should be completed, verified, and reviewed before moving to the next one.

## Current Status

* Step 1: Product masterplan - Done
* Step 2: Next.js app scaffold - Done
* Step 3: Browser microphone recording - Done
* Step 4: Local meeting draft storage - Done
* Step 5: Backend choice and setup - Done
* Step 6: Authentication - Done
* Step 7: Persistent recording storage - Done
* Step 8: Transcription - Done
* Step 9: Speaker separation - Skipped for now
* Step 10: AI meeting notes - Done
* Step 11: Export - Next
* Step 12: Mobile and product polish - Done out of order

---

## Step 1: Product Masterplan

Status: Done

Goal:
Capture the product vision, MVP scope, target users, data model, security notes, and phased roadmap.

Implemented:

* Added `masterplan.md`
* Defined MVP as Record -> Transcribe -> Review -> Save
* Defined core entities: User, Meeting, Transcript, Summary, ActionItem, Decision

Acceptance check:

* Product direction is documented in the repo.

---

## Step 2: App Scaffold

Status: Done

Goal:
Create the actual web app foundation.

Implemented:

* Next.js app router project
* React and TypeScript
* Tailwind CSS
* ESLint
* Responsive first screen
* Meeting title field
* Language selector
* Recording status UI
* Timer-only start and stop state

Acceptance checks:

* `npm run lint` passes
* `npm run build` passes
* App runs at `http://localhost:3000`

---

## Step 3: Browser Microphone Recording

Status: Done

Goal:
Turn the recorder UI into real browser audio recording.

Implemented:

* Microphone permission request
* Browser `MediaRecorder` integration
* Start recording
* Stop recording
* Duration tracking
* Local audio preview
* Audio download
* Permission and unsupported-browser error handling
* Microphone tracks stop after recording

Acceptance checks:

* User can start recording after browser permission
* User can stop recording
* User can play back the captured audio
* User can download the captured audio
* `npm run lint` passes
* `npm run build` passes

---

## Step 4: Local Meeting Draft Storage

Status: Done

Goal:
Keep completed recordings in a local in-browser meeting list before adding backend storage.

Scope:

* Create a meeting draft after recording stops
* Store title, date, language, duration, audio URL, and audio metadata in React state
* Show a simple meeting history list on the page
* Allow selecting a previous local draft
* Allow deleting a local draft

Implemented:

* Completed recordings are added to a local meeting draft list
* Drafts store title, date, language, duration, audio URL, MIME type, file name, and file size
* Draft list shows title, date, duration, language, and size
* Selecting a draft shows playback and meeting details
* Deleting a draft revokes the local audio URL

Out of scope:

* Permanent backend storage
* User accounts
* Transcription

Acceptance checks:

* Stopping a recording creates a visible meeting draft
* Meeting drafts show title, date, duration, and language
* User can replay a draft recording
* User can delete a draft
* `npm run lint` passes
* `npm run build` passes

---

## Step 5: Backend Choice And Setup

Status: Done

Goal:
Add persistent user-owned storage.

Recommended stack:

* Supabase Auth for Google Sign-In
* Supabase Postgres for meeting metadata
* Supabase Storage for audio files

Scope:

* Add environment variable template
* Add Supabase client
* Add database schema notes or migrations
* Add auth placeholder flow

Implemented:

* Added `@supabase/supabase-js`
* Added `.env.example`
* Added typed environment helpers
* Added browser and server Supabase client helpers
* Added database TypeScript types
* Added `supabase/schema.sql`
* Added Supabase setup notes
* Added `/api/backend/status`
* Added backend setup status and Google Sign-In placeholder in the app

Acceptance checks:

* App can connect to Supabase with env vars
* Schema supports users, meetings, transcripts, summaries, action items, decisions, and topics
* Local development fails clearly when env vars are missing

---

## Step 6: Authentication

Status: Done

Goal:
Let a user sign in with Google and isolate their meeting data.

Scope:

* Google Sign-In
* Signed-in and signed-out states
* User profile display
* Require authentication before saving meetings permanently

Implemented:

* Added Google OAuth sign-in button
* Added current Supabase session detection
* Added auth state subscription
* Added signed-in user display
* Added sign out
* Added UI guidance that permanent saving requires authentication

Acceptance checks:

* User can sign in with Google
* User can sign out
* Persistent saves are gated behind the signed-in user for Step 7

---

## Step 7: Persistent Recording Storage

Status: Done

Goal:
Upload recorded audio and save meeting metadata.

Scope:

* Upload recorded audio to storage
* Save meeting metadata to database
* Show saved meeting list
* Delete meeting and associated audio

Implemented:

* Added permanent save action for local drafts
* Uploads audio to private Supabase Storage under the signed-in user path
* Inserts meeting metadata into the `meetings` table
* Loads saved meetings after sign-in
* Creates signed URLs for saved audio playback
* Deletes saved meeting metadata and associated audio
* Keeps local drafts separate from persisted meetings

Acceptance checks:

* Recording can be saved after stop
* Refreshing the page keeps saved meetings
* Deleting a meeting removes metadata and audio

---

## Step 8: Transcription

Status: Done

Goal:
Convert saved audio into text.

Scope:

* Send audio to speech-to-text service
* Store transcript text
* Show transcript on the meeting detail screen
* Allow editing transcript text

Implemented:

* Added `openai` Node SDK
* Added server-only `OPENAI_API_KEY` env placeholder
* Added guarded `OPENAI_TRANSCRIPTION_MODEL` config
* Added `/api/transcribe`
* Downloads authenticated meeting audio from Supabase Storage
* Transcribes saved audio with a cost-conscious default model
* Stores transcript text in Supabase `transcripts`
* Loads saved transcripts with saved meetings
* Allows editing and saving transcript text
* Shows OpenAI quota and billing errors clearly in the app
* Allows editing local draft titles and saved meeting titles

Initial language support:

* English
* Danish
* Urdu

Acceptance checks:

* User can transcribe a saved recording
* Transcript is stored with the meeting
* User can edit and save transcript changes

---

## Step 9: Speaker Separation

Status: Skipped for now

Goal:
Improve transcript readability with generic speaker labels.

Scope:

* Speaker 1, Speaker 2, Speaker 3 labels
* No real speaker identity required
* Editable transcript remains supported

Acceptance checks:

* Transcript can display speaker-labeled segments
* User can edit speaker-labeled transcript text

---

## Step 10: AI Meeting Notes

Status: Done

Goal:
Generate useful meeting outputs from the transcript.

Scope:

* Summary
* Action items
* Decisions
* Topics discussed
* Editable generated notes

Implemented:

* Added guarded `OPENAI_NOTES_MODEL` config
* Added `/api/generate-notes`
* Generates structured notes from saved transcript text
* Stores summary, decisions, and topics in `meeting_notes`
* Stores action items in `action_items`
* Loads notes with saved meetings
* Allows editing and saving summary, action items, decisions, and topics

Acceptance checks:

* User can generate notes from a transcript
* User can edit summary, action items, decisions, and topics
* Generated output is saved with the meeting

---

## Step 11: Export

Status: Next

Goal:
Let users take meeting information out of the app.

Scope:

* Copy transcript
* Download transcript
* Export meeting notes

Acceptance checks:

* User can copy transcript
* User can download transcript
* User can export notes in a readable format

---

## Step 12: Mobile And Product Polish

Status: Done out of order

Goal:
Make the MVP pleasant and reliable on phones and desktop.

Scope:

* Mobile layout pass
* Loading and empty states
* Error states
* Recording guidance
* Performance checks for longer meetings

Implemented:

* Added uploaded MeetingMind logo to app branding
* Added favicon/app icon/apple icon assets
* Added Open Graph image metadata
* Added recording consent confirmation before recording
* Improved current meeting branding panel
* Added long-recording guidance in the status panel
* Kept responsive controls wrapped for small screens

Acceptance checks:

* Core flow works on desktop and mobile browser
* UI remains readable at small screen widths
* Long recordings fail gracefully or show clear constraints

---

## Future Steps

These are intentionally after the MVP.

* Audio upload
* Video upload
* Meeting search
* AI meeting memory Q&A
* Zoom, Teams, Google Meet, and Calendar integrations
