"use client";

import {
  Clock,
  CalendarDays,
  Cloud,
  Download,
  FileAudio,
  FileText,
  KeyRound,
  Languages,
  LogOut,
  Mic,
  RefreshCw,
  Save,
  ShieldCheck,
  Square,
  TimerReset,
  Trash2,
  UserRound,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicEnvStatus } from "@/lib/env";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/types";

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
  audioBlob: Blob;
  audioUrl: string;
  audioMimeType: string;
  fileName: string;
  sizeBytes: number;
};

type MeetingRow = Database["public"]["Tables"]["meetings"]["Row"];

type SavedMeeting = MeetingRow & {
  signedAudioUrl: string | null;
  transcriptContent: string;
  transcriptUpdatedAt: string | null;
};

type MeetingRecorderProps = {
  backendStatus: PublicEnvStatus;
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

export function MeetingRecorder({ backendStatus }: MeetingRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState("Untitled meeting");
  const [language, setLanguage] = useState("English");
  const [meetingDrafts, setMeetingDrafts] = useState<MeetingDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(backendStatus.isConfigured);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedMeetings, setSavedMeetings] = useState<SavedMeeting[]>([]);
  const [selectedSavedMeetingId, setSelectedSavedMeetingId] = useState<string | null>(null);
  const [isSavedMeetingsLoading, setIsSavedMeetingsLoading] = useState(false);
  const [savedMeetingError, setSavedMeetingError] = useState<string | null>(null);
  const [savingDraftId, setSavingDraftId] = useState<string | null>(null);
  const [deletingSavedMeetingId, setDeletingSavedMeetingId] = useState<string | null>(null);
  const [savedMeetingsRefreshKey, setSavedMeetingsRefreshKey] = useState(0);
  const [transcribingMeetingId, setTranscribingMeetingId] = useState<string | null>(null);
  const [savingTranscriptMeetingId, setSavingTranscriptMeetingId] = useState<string | null>(null);
  const [savingTitleMeetingId, setSavingTitleMeetingId] = useState<string | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const draftAudioUrlsRef = useRef<Set<string>>(new Set());
  const elapsedSecondsRef = useRef(elapsedSeconds);
  const languageRef = useRef(language);
  const meetingTitleRef = useRef(meetingTitle);

  const supabase = useMemo(() => {
    if (!backendStatus.isConfigured) {
      return null;
    }

    try {
      return createBrowserSupabaseClient();
    } catch {
      return null;
    }
  }, [backendStatus.isConfigured]);

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

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    const supabaseClient = supabase;
    let isMounted = true;

    async function loadSession() {
      setIsAuthLoading(true);
      const { data, error } = await supabaseClient.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      }

      setUser(data.session?.user ?? null);
      setIsAuthLoading(false);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthError(null);
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const selectedDraft = useMemo(
    () => meetingDrafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [meetingDrafts, selectedDraftId],
  );
  const selectedSavedMeeting = useMemo(
    () => savedMeetings.find((meeting) => meeting.id === selectedSavedMeetingId) ?? null,
    [savedMeetings, selectedSavedMeetingId],
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

    if (selectedSavedMeeting) {
      return "Saved meeting selected";
    }

    if (elapsedSeconds > 0) {
      return "Recording stopped";
    }

    return "Ready to record";
  }, [elapsedSeconds, isPreparing, isRecording, selectedDraft, selectedSavedMeeting]);

  useEffect(() => {
    if (!supabase || !user) {
      setSavedMeetings([]);
      setSelectedSavedMeetingId(null);
      setIsSavedMeetingsLoading(false);
      return;
    }

    const supabaseClient = supabase;
    let isMounted = true;

    async function loadSavedMeetings() {
      setIsSavedMeetingsLoading(true);
      setSavedMeetingError(null);

      const { data, error } = await supabaseClient
        .from("meetings")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setSavedMeetingError(error.message);
        setIsSavedMeetingsLoading(false);
        return;
      }

      const meetings = (data ?? []) as MeetingRow[];
      const meetingIds = meetings.map((meeting) => meeting.id);
      const { data: transcriptRows, error: transcriptsError } =
        meetingIds.length > 0
          ? await supabaseClient
              .from("transcripts")
              .select("meeting_id, content, updated_at")
              .in("meeting_id", meetingIds)
          : { data: [], error: null };

      if (!isMounted) {
        return;
      }

      if (transcriptsError) {
        setSavedMeetingError(transcriptsError.message);
        setIsSavedMeetingsLoading(false);
        return;
      }

      const transcriptByMeetingId = new Map(
        (transcriptRows ?? []).map((row) => [
          row.meeting_id,
          {
            content: row.content,
            updatedAt: row.updated_at,
          },
        ]),
      );
      const meetingsWithAudio = await Promise.all(
        meetings.map(async (meeting): Promise<SavedMeeting> => {
          const transcript = transcriptByMeetingId.get(meeting.id);

          if (!meeting.audio_path) {
            return {
              ...meeting,
              signedAudioUrl: null,
              transcriptContent: transcript?.content ?? "",
              transcriptUpdatedAt: transcript?.updatedAt ?? null,
            };
          }

          const { data: signedUrlData } = await supabaseClient.storage
            .from("meeting-audio")
            .createSignedUrl(meeting.audio_path, 60 * 60);

          return {
            ...meeting,
            signedAudioUrl: signedUrlData?.signedUrl ?? null,
            transcriptContent: transcript?.content ?? "",
            transcriptUpdatedAt: transcript?.updatedAt ?? null,
          };
        }),
      );

      if (!isMounted) {
        return;
      }

      setSavedMeetings(meetingsWithAudio);
      setSelectedSavedMeetingId((current) =>
        current && meetingsWithAudio.some((meeting) => meeting.id === current) ? current : null,
      );
      setIsSavedMeetingsLoading(false);
    }

    void loadSavedMeetings();

    return () => {
      isMounted = false;
    };
  }, [savedMeetingsRefreshKey, supabase, user]);

  useEffect(() => {
    setTranscriptDraft(selectedSavedMeeting?.transcriptContent ?? "");
  }, [selectedSavedMeeting?.id, selectedSavedMeeting?.transcriptContent]);

  async function startRecording() {
    setRecordingError(null);

    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      setRecordingError("This browser does not support microphone recording.");
      return;
    }

    setIsPreparing(true);

    try {
      setSelectedDraftId(null);
      setSelectedSavedMeetingId(null);
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
          audioBlob,
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
    setSelectedSavedMeetingId(null);
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

  async function saveDraft(draft: MeetingDraft) {
    if (!supabase || !user) {
      setSavedMeetingError("Sign in before saving recordings.");
      return;
    }

    const title = draft.title.trim() || "Untitled meeting";
    const audioPath = `${user.id}/${draft.id}/${draft.fileName}`;
    setSavingDraftId(draft.id);
    setSavedMeetingError(null);

    const { error: uploadError } = await supabase.storage
      .from("meeting-audio")
      .upload(audioPath, draft.audioBlob, {
        contentType: draft.audioMimeType,
        upsert: false,
      });

    if (uploadError) {
      setSavedMeetingError(uploadError.message);
      setSavingDraftId(null);
      return;
    }

    const { error: insertError } = await supabase.from("meetings").insert({
      id: draft.id,
      user_id: user.id,
      title,
      created_at: draft.createdAt,
      duration_seconds: draft.durationSeconds,
      language: draft.language,
      audio_path: audioPath,
      audio_mime_type: draft.audioMimeType,
      audio_size_bytes: draft.sizeBytes,
    });

    if (insertError) {
      await supabase.storage.from("meeting-audio").remove([audioPath]);
      setSavedMeetingError(insertError.message);
      setSavingDraftId(null);
      return;
    }

    URL.revokeObjectURL(draft.audioUrl);
    draftAudioUrlsRef.current.delete(draft.audioUrl);
    setMeetingDrafts((current) => current.filter((item) => item.id !== draft.id));
    setSelectedDraftId(null);
    setSelectedSavedMeetingId(draft.id);
    setSavingDraftId(null);
    setSavedMeetingsRefreshKey((current) => current + 1);
  }

  async function deleteSavedMeeting(meeting: SavedMeeting) {
    if (!supabase) {
      return;
    }

    setDeletingSavedMeetingId(meeting.id);
    setSavedMeetingError(null);

    if (meeting.audio_path) {
      const { error: storageError } = await supabase.storage
        .from("meeting-audio")
        .remove([meeting.audio_path]);

      if (storageError) {
        setSavedMeetingError(storageError.message);
        setDeletingSavedMeetingId(null);
        return;
      }
    }

    const { error: deleteError } = await supabase.from("meetings").delete().eq("id", meeting.id);

    if (deleteError) {
      setSavedMeetingError(deleteError.message);
      setDeletingSavedMeetingId(null);
      return;
    }

    setSavedMeetings((current) => current.filter((item) => item.id !== meeting.id));
    setSelectedSavedMeetingId((current) => (current === meeting.id ? null : current));
    setDeletingSavedMeetingId(null);
  }

  async function transcribeSavedMeeting(meeting: SavedMeeting) {
    if (!supabase) {
      setSavedMeetingError("Supabase is not configured.");
      return;
    }

    setTranscribingMeetingId(meeting.id);
    setSavedMeetingError(null);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setSavedMeetingError(sessionError?.message ?? "Sign in before transcribing meetings.");
      setTranscribingMeetingId(null);
      return;
    }

    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ meetingId: meeting.id }),
    });
    const data = (await response.json()) as { transcript?: string; error?: string };

    if (!response.ok || typeof data.transcript !== "string") {
      setSavedMeetingError(data.error ?? "Could not transcribe this meeting.");
      setTranscribingMeetingId(null);
      return;
    }

    const updatedAt = new Date().toISOString();
    setSavedMeetings((current) =>
      current.map((item) =>
        item.id === meeting.id
          ? {
              ...item,
              transcriptContent: data.transcript ?? "",
              transcriptUpdatedAt: updatedAt,
            }
          : item,
      ),
    );
    setTranscriptDraft(data.transcript);
    setTranscribingMeetingId(null);
  }

  async function saveTranscript(meeting: SavedMeeting) {
    if (!supabase) {
      setSavedMeetingError("Supabase is not configured.");
      return;
    }

    setSavingTranscriptMeetingId(meeting.id);
    setSavedMeetingError(null);

    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from("transcripts").upsert({
      meeting_id: meeting.id,
      content: transcriptDraft,
      updated_at: updatedAt,
    });

    if (error) {
      setSavedMeetingError(error.message);
      setSavingTranscriptMeetingId(null);
      return;
    }

    setSavedMeetings((current) =>
      current.map((item) =>
        item.id === meeting.id
          ? {
              ...item,
              transcriptContent: transcriptDraft,
              transcriptUpdatedAt: updatedAt,
            }
          : item,
      ),
    );
    setSavingTranscriptMeetingId(null);
  }

  function updateCurrentTitle(title: string) {
    if (selectedDraft) {
      setMeetingDrafts((current) =>
        current.map((draft) =>
          draft.id === selectedDraft.id
            ? {
                ...draft,
                title,
                fileName: getRecordingFileName(title, draft.audioMimeType),
              }
            : draft,
        ),
      );
      return;
    }

    if (selectedSavedMeeting) {
      setSavedMeetings((current) =>
        current.map((meeting) =>
          meeting.id === selectedSavedMeeting.id
            ? {
                ...meeting,
                title,
              }
            : meeting,
        ),
      );
      return;
    }

    setMeetingTitle(title);
  }

  async function saveSavedMeetingTitle(meeting: SavedMeeting) {
    if (!supabase) {
      setSavedMeetingError("Supabase is not configured.");
      return;
    }

    const title = meeting.title.trim() || "Untitled meeting";
    setSavingTitleMeetingId(meeting.id);
    setSavedMeetingError(null);

    const { error } = await supabase.from("meetings").update({ title }).eq("id", meeting.id);

    if (error) {
      setSavedMeetingError(error.message);
      setSavingTitleMeetingId(null);
      return;
    }

    setSavedMeetings((current) =>
      current.map((item) =>
        item.id === meeting.id
          ? {
              ...item,
              title,
            }
          : item,
      ),
    );
    setSavingTitleMeetingId(null);
  }

  const displayedTitle = selectedDraft?.title ?? selectedSavedMeeting?.title ?? meetingTitle;
  const displayedLanguage = selectedDraft?.language ?? selectedSavedMeeting?.language ?? language;
  const displayedDuration =
    selectedDraft?.durationSeconds ?? selectedSavedMeeting?.duration_seconds ?? elapsedSeconds;
  const displayName =
    typeof user?.user_metadata.name === "string"
      ? user.user_metadata.name
      : typeof user?.user_metadata.full_name === "string"
        ? user.user_metadata.full_name
        : user?.email ?? "Signed-in user";

  async function signInWithGoogle() {
    if (!supabase) {
      setAuthError("Supabase is not configured.");
      return;
    }

    setAuthError(null);
    setIsAuthLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setAuthError(error.message);
      setIsAuthLoading(false);
    }
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    setAuthError(null);
    setIsAuthLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError(error.message);
    } else {
      setUser(null);
    }

    setIsAuthLoading(false);
  }

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
                  value={displayedTitle}
                  onChange={(event) => updateCurrentTitle(event.target.value)}
                />
              </label>

              {selectedSavedMeeting && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold text-graphite transition hover:border-ocean/50 hover:text-ocean disabled:opacity-55"
                    disabled={savingTitleMeetingId === selectedSavedMeeting.id}
                    onClick={() => saveSavedMeetingTitle(selectedSavedMeeting)}
                    type="button"
                  >
                    <Save className="h-4 w-4" />
                    {savingTitleMeetingId === selectedSavedMeeting.id ? "Saving title" : "Save title"}
                  </button>
                  <span className="text-sm font-medium text-graphite">
                    Title edits on saved meetings are permanent after saving.
                  </span>
                </div>
              )}

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
                  disabled={
                    isRecording ||
                    isPreparing ||
                    (elapsedSeconds === 0 && !selectedDraft && !selectedSavedMeeting)
                  }
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

            {(recordingError || savedMeetingError || selectedDraft || selectedSavedMeeting) && (
              <div className="mt-5 rounded-lg border border-ink/10 bg-cloud p-4">
                {recordingError && (
                  <p className="text-sm font-semibold text-coral">{recordingError}</p>
                )}
                {savedMeetingError && (
                  <p className="text-sm font-semibold text-coral">{savedMeetingError}</p>
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
                      <button
                        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md bg-ocean px-4 text-sm font-semibold text-white transition hover:bg-[#245b76] disabled:opacity-55"
                        disabled={!user || savingDraftId === selectedDraft.id}
                        onClick={() => saveDraft(selectedDraft)}
                        type="button"
                      >
                        <Save className="h-4 w-4" />
                        {savingDraftId === selectedDraft.id ? "Saving" : "Save permanently"}
                      </button>
                    </div>
                    {!user && (
                      <p className="text-sm font-medium text-graphite">
                        Sign in with Google before saving this draft permanently.
                      </p>
                    )}
                  </div>
                )}

                {selectedSavedMeeting && (
                  <div className="grid gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-graphite">
                      <Cloud className="h-4 w-4 text-ocean" />
                      {selectedSavedMeeting.title}
                    </div>
                    {selectedSavedMeeting.signedAudioUrl ? (
                      <audio
                        aria-label={`Saved audio for ${selectedSavedMeeting.title}`}
                        className="w-full"
                        controls
                        src={selectedSavedMeeting.signedAudioUrl}
                      />
                    ) : (
                      <p className="text-sm font-medium text-graphite">
                        Audio is saved, but no playable signed URL is available.
                      </p>
                    )}
                    <button
                      className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md border border-coral/35 bg-white px-4 text-sm font-semibold text-coral transition hover:bg-coral hover:text-white disabled:opacity-55"
                      disabled={deletingSavedMeetingId === selectedSavedMeeting.id}
                      onClick={() => deleteSavedMeeting(selectedSavedMeeting)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingSavedMeetingId === selectedSavedMeeting.id ? "Deleting" : "Delete saved meeting"}
                    </button>
                    <button
                      className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md bg-ocean px-4 text-sm font-semibold text-white transition hover:bg-[#245b76] disabled:opacity-55"
                      disabled={transcribingMeetingId === selectedSavedMeeting.id}
                      onClick={() => transcribeSavedMeeting(selectedSavedMeeting)}
                      type="button"
                    >
                      <FileText className="h-4 w-4" />
                      {transcribingMeetingId === selectedSavedMeeting.id
                        ? "Transcribing"
                        : selectedSavedMeeting.transcriptContent
                          ? "Retranscribe"
                          : "Transcribe"}
                    </button>
                    <div className="grid gap-3 border-t border-ink/10 pt-4">
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-graphite">Transcript</span>
                        <textarea
                          className="min-h-44 rounded-md border border-ink/15 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-ocean focus:ring-4 focus:ring-ocean/15"
                          onChange={(event) => setTranscriptDraft(event.target.value)}
                          placeholder="Transcribe the saved audio, then edit the transcript here."
                          value={transcriptDraft}
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold text-graphite transition hover:border-ocean/50 hover:text-ocean disabled:opacity-55"
                          disabled={savingTranscriptMeetingId === selectedSavedMeeting.id}
                          onClick={() => saveTranscript(selectedSavedMeeting)}
                          type="button"
                        >
                          <Save className="h-4 w-4" />
                          {savingTranscriptMeetingId === selectedSavedMeeting.id
                            ? "Saving transcript"
                            : "Save transcript"}
                        </button>
                        {selectedSavedMeeting.transcriptUpdatedAt && (
                          <span className="text-sm font-medium text-graphite">
                            Updated {formatDraftDate(selectedSavedMeeting.transcriptUpdatedAt)}
                          </span>
                        )}
                      </div>
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
                <dd className="font-semibold">
                  {selectedDraft || selectedSavedMeeting ? "Captured" : "Not captured"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/12 pt-3">
                <dt className="text-white/65">Local drafts</dt>
                <dd className="font-semibold">{meetingDrafts.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/12 pt-3">
                <dt className="text-white/65">Saved</dt>
                <dd className="font-semibold">{savedMeetings.length}</dd>
              </div>
            </dl>

            <div className="rounded-md bg-white/9 p-4 text-sm leading-6 text-white/78">
              Saved meetings store audio and metadata now. Transcript, summary,
              action items, decisions, and topics come next.
            </div>

            <div className="border-t border-white/12 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Cloud className="h-4 w-4 text-mint" />
                  Backend
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    backendStatus.isConfigured
                      ? "bg-mint text-ink"
                      : "bg-coral/20 text-[#ffd7ce]"
                  }`}
                >
                  {backendStatus.isConfigured ? "Configured" : "Missing env"}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm leading-6 text-white/72">
                {backendStatus.isConfigured ? (
                  <p>Supabase is ready for authenticated storage.</p>
                ) : (
                  <p>Copy `.env.example` to `.env.local` and add Supabase project values.</p>
                )}

                {backendStatus.missingKeys.length > 0 && (
                  <ul className="grid gap-1 font-mono text-xs text-[#ffd7ce]">
                    {backendStatus.missingKeys.map((key) => (
                      <li key={key}>{key}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 rounded-md border border-white/12 bg-white/7 p-3">
                {user ? (
                  <div className="grid gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-ink">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                        {user.email && (
                          <p className="truncate text-xs font-medium text-white/62">{user.email}</p>
                        )}
                      </div>
                    </div>
                    <button
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/16 bg-white px-3 text-sm font-semibold text-ink transition hover:bg-mint disabled:opacity-55"
                      disabled={isAuthLoading}
                      onClick={signOut}
                      type="button"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                ) : (
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-ink transition hover:bg-mint disabled:opacity-55"
                    disabled={!backendStatus.isConfigured || isAuthLoading}
                    onClick={signInWithGoogle}
                    type="button"
                  >
                    <KeyRound className="h-4 w-4" />
                    {isAuthLoading ? "Checking session" : "Sign in with Google"}
                  </button>
                )}

                {authError && (
                  <p className="mt-3 text-xs font-semibold leading-5 text-[#ffd7ce]">
                    {authError}
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-white/62">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                {user
                  ? "Permanent saves use this account."
                  : "Sign in before saving recordings permanently."}
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white/82 p-5 shadow-panel backdrop-blur sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-ocean">Local drafts</p>
              <h2 className="mt-1 text-2xl font-semibold text-ink">Draft recordings</h2>
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
                          setSelectedSavedMeetingId(null);
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
                            setSelectedSavedMeetingId(null);
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
                        <button
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ocean px-3 text-sm font-semibold text-white transition hover:bg-[#245b76] disabled:opacity-55"
                          disabled={!user || savingDraftId === draft.id}
                          onClick={() => saveDraft(draft)}
                          type="button"
                        >
                          <Save className="h-4 w-4" />
                          {savingDraftId === draft.id ? "Saving" : "Save"}
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

        <section className="rounded-lg border border-ink/10 bg-white/82 p-5 shadow-panel backdrop-blur sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-ocean">Supabase</p>
              <h2 className="mt-1 text-2xl font-semibold text-ink">Saved meetings</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-graphite">
                {!user
                  ? "Sign in to load saved meetings"
                  : isSavedMeetingsLoading
                    ? "Loading"
                    : `${savedMeetings.length} saved`}
              </p>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-semibold text-graphite transition hover:border-ocean/50 hover:text-ocean disabled:opacity-45"
                disabled={!user || isSavedMeetingsLoading}
                onClick={() => setSavedMeetingsRefreshKey((current) => current + 1)}
                type="button"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {savedMeetingError && (
            <p className="mt-4 rounded-md bg-[#fff0ec] px-4 py-3 text-sm font-semibold text-coral">
              {savedMeetingError}
            </p>
          )}

          {!user ? (
            <div className="mt-5 rounded-lg border border-dashed border-ink/20 bg-cloud p-6 text-sm font-medium text-graphite">
              Sign in with Google to save and reload meeting recordings.
            </div>
          ) : savedMeetings.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-ink/20 bg-cloud p-6 text-sm font-medium text-graphite">
              Saved meetings will appear here after you save a draft.
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {savedMeetings.map((meeting) => {
                const isSelected = meeting.id === selectedSavedMeetingId;

                return (
                  <article
                    className={`grid gap-3 rounded-lg border p-4 transition ${
                      isSelected
                        ? "border-ocean bg-mint/70"
                        : "border-ink/10 bg-cloud hover:border-ocean/45"
                    }`}
                    key={meeting.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <button
                        className="grid min-w-0 gap-2 text-left"
                        onClick={() => {
                          setSelectedSavedMeetingId(meeting.id);
                          setSelectedDraftId(null);
                          setElapsedSeconds(meeting.duration_seconds);
                        }}
                        type="button"
                      >
                        <span className="break-words text-lg font-semibold text-ink">
                          {meeting.title}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-graphite">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 text-ocean" />
                            {formatDraftDate(meeting.created_at)}
                          </span>
                          <span>{meeting.language}</span>
                          <span className="font-mono">
                            {formatDuration(meeting.duration_seconds)}
                          </span>
                          {meeting.audio_size_bytes && (
                            <span>{formatBytes(meeting.audio_size_bytes)}</span>
                          )}
                          <span>
                            {meeting.transcriptContent ? "Transcript saved" : "No transcript"}
                          </span>
                        </span>
                      </button>

                      <div className="flex shrink-0 gap-2">
                        <button
                          className="inline-flex h-10 items-center justify-center rounded-md border border-ink/15 bg-white px-3 text-sm font-semibold text-graphite transition hover:border-ocean/50 hover:text-ocean"
                          onClick={() => {
                            setSelectedSavedMeetingId(meeting.id);
                            setSelectedDraftId(null);
                            setElapsedSeconds(meeting.duration_seconds);
                          }}
                          type="button"
                        >
                          Select
                        </button>
                        <button
                          className="inline-flex h-10 min-w-10 items-center justify-center rounded-md border border-coral/35 bg-white px-3 text-sm font-semibold text-coral transition hover:bg-coral hover:text-white disabled:opacity-55"
                          disabled={deletingSavedMeetingId === meeting.id}
                          onClick={() => deleteSavedMeeting(meeting)}
                          title="Delete saved meeting"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ocean px-3 text-sm font-semibold text-white transition hover:bg-[#245b76] disabled:opacity-55"
                          disabled={transcribingMeetingId === meeting.id}
                          onClick={() => {
                            setSelectedSavedMeetingId(meeting.id);
                            setSelectedDraftId(null);
                            setElapsedSeconds(meeting.duration_seconds);
                            transcribeSavedMeeting(meeting);
                          }}
                          type="button"
                        >
                          <FileText className="h-4 w-4" />
                          {transcribingMeetingId === meeting.id ? "Transcribing" : "Transcribe"}
                        </button>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="grid gap-3">
                        {meeting.signedAudioUrl && (
                          <audio
                            aria-label={`Saved audio for ${meeting.title}`}
                            className="w-full"
                            controls
                            src={meeting.signedAudioUrl}
                          />
                        )}
                        {meeting.transcriptContent && (
                          <p className="line-clamp-3 text-sm leading-6 text-graphite">
                            {meeting.transcriptContent}
                          </p>
                        )}
                      </div>
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
