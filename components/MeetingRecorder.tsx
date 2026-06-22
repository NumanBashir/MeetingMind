"use client";

import {
  Clock,
  CalendarDays,
  Download,
  FileAudio,
  FileText,
  Languages,
  Mic,
  Square,
  TimerReset,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const languages = ["English", "Danish", "Urdu"];
const preferredMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

type MeetingDraft = {
  id: string;
  title: string;
  createdAt: string;
  durationSeconds: number;
  language: string;
  audioUrl: string;
  audioMimeType: string;
  fileName: string;
  sizeBytes: number;
};

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value) => value.toString().padStart(2, "0"))
      .join(":");
  }

  return [minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

function getSupportedMimeType() {
  if (typeof window === "undefined" || !("MediaRecorder" in window)) {
    return "";
  }

  return preferredMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

function getFileExtension(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "m4a";
  }

  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  return "webm";
}

function getRecordingFileName(title: string, mimeType: string) {
  const safeTitle =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "meeting";
  const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  return `${safeTitle}-${date}.${getFileExtension(mimeType)}`;
}

function formatDraftDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function createDraftId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function MeetingRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState("Untitled meeting");
  const [language, setLanguage] = useState("English");
  const [meetingDrafts, setMeetingDrafts] = useState<MeetingDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const draftAudioUrlsRef = useRef<Set<string>>(new Set());
  const elapsedSecondsRef = useRef(elapsedSeconds);
  const languageRef = useRef(language);
  const meetingTitleRef = useRef(meetingTitle);

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    meetingTitleRef.current = meetingTitle;
  }, [meetingTitle]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    const draftAudioUrls = draftAudioUrlsRef.current;

    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      draftAudioUrls.forEach((audioUrl) => URL.revokeObjectURL(audioUrl));
      draftAudioUrls.clear();
    };
  }, []);

  const selectedDraft = useMemo(
    () => meetingDrafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [meetingDrafts, selectedDraftId],
  );

  const recordingStatus = useMemo(() => {
    if (isPreparing) {
      return "Preparing microphone";
    }

    if (isRecording) {
      return "Recording in progress";
    }

    if (selectedDraft) {
      return "Draft selected";
    }

    if (elapsedSeconds > 0) {
      return "Recording stopped";
    }

    return "Ready to record";
  }, [elapsedSeconds, isPreparing, isRecording, selectedDraft]);

  async function startRecording() {
    setRecordingError(null);

    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      setRecordingError("This browser does not support microphone recording.");
      return;
    }

    setIsPreparing(true);

    try {
      setSelectedDraftId(null);
      setElapsedSeconds(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const recorderMimeType = recorder.mimeType || mimeType || "audio/webm";

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: recorderMimeType });
        const title = meetingTitleRef.current.trim() || "Untitled meeting";
        const createdAt = new Date().toISOString();
        const draftId = createDraftId();
        const audioUrl = URL.createObjectURL(audioBlob);
        draftAudioUrlsRef.current.add(audioUrl);
        const draft: MeetingDraft = {
          id: draftId,
          title,
          createdAt,
          durationSeconds: elapsedSecondsRef.current,
          language: languageRef.current,
          audioUrl,
          audioMimeType: recorderMimeType,
          fileName: getRecordingFileName(title, recorderMimeType),
          sizeBytes: audioBlob.size,
        };

        chunksRef.current = [];
        setMeetingDrafts((current) => [draft, ...current]);
        setSelectedDraftId(draftId);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
      };

      recorder.onerror = () => {
        setRecordingError("Recording stopped because the browser reported an audio error.");
        setIsRecording(false);
      };

      recorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone permission was denied."
          : "Could not start microphone recording.";
      setRecordingError(message);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
    } finally {
      setIsPreparing(false);
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder?.state === "recording") {
      recorder.stop();
    }

    setIsRecording(false);
  }

  function resetRecording() {
    setSelectedDraftId(null);
    setElapsedSeconds(0);
    setRecordingError(null);
    chunksRef.current = [];
  }

  function deleteDraft(draftId: string) {
    setMeetingDrafts((current) => {
      const draftToDelete = current.find((draft) => draft.id === draftId);

      if (draftToDelete) {
        URL.revokeObjectURL(draftToDelete.audioUrl);
        draftAudioUrlsRef.current.delete(draftToDelete.audioUrl);
      }

      return current.filter((draft) => draft.id !== draftId);
    });

    setSelectedDraftId((current) => (current === draftId ? null : current));
  }

  const displayedTitle = selectedDraft?.title ?? meetingTitle;
  const displayedLanguage = selectedDraft?.language ?? language;
  const displayedDuration = selectedDraft?.durationSeconds ?? elapsedSeconds;

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-ink/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-ocean">MeetingMind</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">
              Meeting recorder
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-white/75 px-4 py-2 text-sm font-medium text-graphite shadow-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isRecording ? "animate-pulse bg-coral" : "bg-ocean"
              }`}
            />
            {recordingStatus}
          </div>
        </header>

        <section className="grid flex-1 gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="flex flex-col justify-between rounded-lg border border-ink/10 bg-white/82 p-5 shadow-panel backdrop-blur sm:p-7">
            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-graphite">Meeting title</span>
                <input
                  className="min-h-12 rounded-md border border-ink/15 bg-white px-4 text-lg font-semibold text-ink outline-none transition focus:border-ocean focus:ring-4 focus:ring-ocean/15"
                  value={meetingTitle}
                  onChange={(event) => setMeetingTitle(event.target.value)}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-ink/10 bg-cloud p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-graphite">
                    <Clock className="h-4 w-4 text-ocean" />
                    Duration
                  </div>
                  <p className="mt-3 font-mono text-4xl font-semibold text-ink">
                    {formatDuration(elapsedSeconds)}
                  </p>
                </div>

                <label className="rounded-lg border border-ink/10 bg-cloud p-4">
                  <span className="flex items-center gap-2 text-sm font-semibold text-graphite">
                    <Languages className="h-4 w-4 text-ocean" />
                    Language
                  </span>
                  <select
                    className="mt-3 h-11 w-full rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-ocean focus:ring-4 focus:ring-ocean/15"
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                  >
                    {languages.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <div className="rounded-lg border border-ink/10 bg-cloud p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-graphite">
                    <FileText className="h-4 w-4 text-ocean" />
                    Output
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-graphite">
                    Transcript, summary, action items, decisions
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-graphite">
                {isRecording
                  ? "Recording audio from your microphone."
                  : "Start a recording to create a local audio file."}
              </div>
              <div className="flex gap-3">
                <button
                  className="inline-flex h-12 min-w-12 items-center justify-center rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold text-graphite transition hover:border-ocean/50 hover:text-ocean disabled:opacity-45"
                  disabled={isRecording || isPreparing || (elapsedSeconds === 0 && !selectedDraft)}
                  onClick={resetRecording}
                  title="Clear selection"
                  type="button"
                >
                  <TimerReset className="h-5 w-5" />
                </button>

                {isRecording ? (
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-graphite"
                    onClick={stopRecording}
                    type="button"
                  >
                    <Square className="h-5 w-5" />
                    Stop
                  </button>
                ) : (
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-coral px-5 text-sm font-semibold text-white transition hover:bg-[#dc654f] disabled:opacity-55"
                    disabled={isPreparing}
                    onClick={startRecording}
                    type="button"
                  >
                    <Mic className="h-5 w-5" />
                    {isPreparing ? "Preparing" : "Start"}
                  </button>
                )}
              </div>
            </div>

            {(recordingError || selectedDraft) && (
              <div className="mt-5 rounded-lg border border-ink/10 bg-cloud p-4">
                {recordingError && (
                  <p className="text-sm font-semibold text-coral">{recordingError}</p>
                )}

                {selectedDraft && (
                  <div className="grid gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-graphite">
                      <FileAudio className="h-4 w-4 text-ocean" />
                      {selectedDraft.title}
                    </div>
                    <audio
                      aria-label="Recorded meeting audio"
                      className="w-full"
                      controls
                      src={selectedDraft.audioUrl}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold text-graphite transition hover:border-ocean/50 hover:text-ocean"
                        download={selectedDraft.fileName}
                        href={selectedDraft.audioUrl}
                      >
                        <Download className="h-4 w-4" />
                        Download audio
                      </a>
                      <button
                        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md border border-coral/35 bg-white px-4 text-sm font-semibold text-coral transition hover:bg-coral hover:text-white"
                        onClick={() => deleteDraft(selectedDraft.id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete draft
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="grid content-start gap-4 rounded-lg border border-ink/10 bg-ink p-5 text-white shadow-panel sm:p-6">
            <div>
              <p className="text-sm font-semibold uppercase text-mint">Current meeting</p>
              <h2 className="mt-2 break-words text-2xl font-semibold">{displayedTitle}</h2>
            </div>

            <dl className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3 border-t border-white/12 pt-3">
                <dt className="text-white/65">Status</dt>
                <dd className="font-semibold">{recordingStatus}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/12 pt-3">
                <dt className="text-white/65">Language</dt>
                <dd className="font-semibold">{displayedLanguage}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/12 pt-3">
                <dt className="text-white/65">Duration</dt>
                <dd className="font-mono font-semibold">{formatDuration(displayedDuration)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/12 pt-3">
                <dt className="text-white/65">Audio</dt>
                <dd className="font-semibold">{selectedDraft ? "Captured" : "Not captured"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/12 pt-3">
                <dt className="text-white/65">Local drafts</dt>
                <dd className="font-semibold">{meetingDrafts.length}</dd>
              </div>
            </dl>

            <div className="rounded-md bg-white/9 p-4 text-sm leading-6 text-white/78">
              Saved meetings will store title, date, duration, transcript, summary,
              action items, decisions, and topics.
            </div>
          </aside>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white/82 p-5 shadow-panel backdrop-blur sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-ocean">Local drafts</p>
              <h2 className="mt-1 text-2xl font-semibold text-ink">Meeting history</h2>
            </div>
            <p className="text-sm font-medium text-graphite">
              {meetingDrafts.length === 0
                ? "No drafts yet"
                : `${meetingDrafts.length} draft${meetingDrafts.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {meetingDrafts.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-ink/20 bg-cloud p-6 text-sm font-medium text-graphite">
              Stop a recording to create your first local meeting draft.
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {meetingDrafts.map((draft) => {
                const isSelected = draft.id === selectedDraftId;

                return (
                  <article
                    className={`grid gap-3 rounded-lg border p-4 transition ${
                      isSelected
                        ? "border-ocean bg-mint/70"
                        : "border-ink/10 bg-cloud hover:border-ocean/45"
                    }`}
                    key={draft.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <button
                        className="grid min-w-0 gap-2 text-left"
                        onClick={() => {
                          setSelectedDraftId(draft.id);
                          setElapsedSeconds(draft.durationSeconds);
                        }}
                        type="button"
                      >
                        <span className="break-words text-lg font-semibold text-ink">
                          {draft.title}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-graphite">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 text-ocean" />
                            {formatDraftDate(draft.createdAt)}
                          </span>
                          <span>{draft.language}</span>
                          <span className="font-mono">{formatDuration(draft.durationSeconds)}</span>
                          <span>{formatBytes(draft.sizeBytes)}</span>
                        </span>
                      </button>

                      <div className="flex shrink-0 gap-2">
                        <button
                          className="inline-flex h-10 items-center justify-center rounded-md border border-ink/15 bg-white px-3 text-sm font-semibold text-graphite transition hover:border-ocean/50 hover:text-ocean"
                          onClick={() => {
                            setSelectedDraftId(draft.id);
                            setElapsedSeconds(draft.durationSeconds);
                          }}
                          type="button"
                        >
                          Select
                        </button>
                        <button
                          className="inline-flex h-10 min-w-10 items-center justify-center rounded-md border border-coral/35 bg-white px-3 text-sm font-semibold text-coral transition hover:bg-coral hover:text-white"
                          onClick={() => deleteDraft(draft.id)}
                          title="Delete draft"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {isSelected && (
                      <audio
                        aria-label={`Audio for ${draft.title}`}
                        className="w-full"
                        controls
                        src={draft.audioUrl}
                      />
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
