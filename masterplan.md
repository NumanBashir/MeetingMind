# Meeting Memory Assistant

## Overview

A personal meeting transcription and note-taking application designed for individuals and small teams who want to remember what was discussed during meetings and quickly identify action items, decisions, and key topics.

The application focuses on simplicity:

Record -> Transcribe -> Review -> Save

Unlike enterprise meeting platforms, the product is designed primarily for personal productivity rather than collaboration.

---

## Objectives

Primary objective:

* Never lose important information from meetings.

Secondary objectives:

* Automatically generate useful meeting notes.
* Extract action items and decisions.
* Provide a searchable history of meetings in future versions.

---

## Target Audience

Primary Users

* Consultants
* Students
* Coaches
* Community leaders
* Board members
* Professionals attending frequent meetings

Secondary Users

* Small teams
* Freelancers
* Interviewers
* Researchers

---

## MVP Features

### Authentication

* Google Sign-In
* Single user account
* Cross-device synchronization

### Meeting Recording

* Start recording
* Stop recording
* Meeting duration tracking

### Language Support

* Danish
* English
* Urdu
* Auto-detect (future enhancement)

### Transcription

* Full meeting transcription
* Speaker separation

  * Speaker 1
  * Speaker 2
  * Speaker 3

No speaker identification required.

### Meeting Storage

Each meeting contains:

* Title
* Date
* Duration
* Transcript
* Summary
* Action items
* Decisions

### AI Outputs

#### Meeting Summary

Concise overview of discussion.

#### Action Items

Example:

* Numan: Contact Mohammed
* Numan: Create WhatsApp groups
* Hamza: Prepare social media plan

#### Decisions

Example:

* Monthly board meetings approved.
* Hamza appointed SoMe lead.

#### Topics Discussed

Example:

* Recruitment
* Social Media
* Organization Structure

### Editing

User can edit:

* Transcript
* Summary
* Action Items
* Decisions

### Export

* Copy transcript
* Download transcript
* Export notes

---

## Future Features

### Phase 2

* Audio upload
* Video upload
* Search meetings

Examples:

* Search "MobilePay"
* Search "Hamza"

### Phase 3

AI meeting memory.

Examples:

* What did we decide about memberships?
* What tasks were assigned to me?
* Show meetings discussing social media.

### Phase 4

Integrations

* Zoom
* Teams
* Google Meet
* Calendar

---

## High-Level Technical Recommendations

### Frontend

Responsive web application.

Reason:

* One codebase
* Desktop and mobile support
* Faster validation

### Backend

Cloud-hosted application.

Responsibilities:

* Store recordings
* Store transcripts
* Manage users
* Handle AI processing

### Storage

Separate storage for:

* Audio files
* Meeting metadata
* Generated notes

---

## Conceptual Data Model

User

* id
* name
* email

Meeting

* id
* title
* createdAt
* duration
* language
* audioFile

Transcript

* meetingId
* content

Summary

* meetingId
* content

ActionItem

* meetingId
* text
* status

Decision

* meetingId
* text

---

## User Experience Principles

### Simplicity

User should be able to start recording within seconds.

### Minimal Friction

Avoid unnecessary configuration.

### Fast Retrieval

Meeting information should be easy to find and read.

### Editable AI

AI suggestions are drafts, not final truth.

---

## Security Considerations

* User-owned data
* Secure storage of recordings
* Ability to delete meetings
* Clear consent before recording
* Private account isolation

---

## Development Phases

### Phase 1

Recording

* Authentication
* Recording
* Storage

### Phase 2

Transcription

* Speech-to-text
* Speaker separation

### Phase 3

AI Notes

* Summary
* Action items
* Decisions

### Phase 4

Polish

* Export
* Mobile optimization
* Performance improvements

---

## Potential Challenges

### Long Meetings

Challenge:
Large transcripts.

Solution:
Chunking and background processing.

### Multiple Languages

Challenge:
Mixed Danish, English, Urdu conversations.

Solution:
Language-aware transcription models.

### Audio Quality

Challenge:
Poor meeting room audio.

Solution:
Noise filtering and recording guidance.

---

## Product Positioning

"Never forget what was said in a meeting again."

A simple personal meeting memory assistant that records conversations, creates transcripts, and turns discussions into actionable outcomes.
