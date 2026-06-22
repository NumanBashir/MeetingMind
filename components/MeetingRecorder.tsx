"use client";

import { Clock, FileText, Languages, Mic, Square, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const languages = ["English", "Danish", "Urdu"];

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

export function MeetingRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState("Untitled meeting");
  const [language, setLanguage] = useState("English");

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRecording]);

  const recordingStatus = useMemo(() => {
    if (isRecording) {
      return "Recording in progress";
    }

    if (elapsedSeconds > 0) {
      return "Recording stopped";
    }

    return "Ready to record";
  }, [elapsedSeconds, isRecording]);

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
                  ? "Keep this tab open while recording."
                  : "Microphone capture will be connected in the next step."}
              </div>
              <div className="flex gap-3">
                <button
                  className="inline-flex h-12 min-w-12 items-center justify-center rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold text-graphite transition hover:border-ocean/50 hover:text-ocean disabled:opacity-45"
                  disabled={isRecording || elapsedSeconds === 0}
                  onClick={() => setElapsedSeconds(0)}
                  title="Reset timer"
                  type="button"
                >
                  <TimerReset className="h-5 w-5" />
                </button>

                {isRecording ? (
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-graphite"
                    onClick={() => setIsRecording(false)}
                    type="button"
                  >
                    <Square className="h-5 w-5" />
                    Stop
                  </button>
                ) : (
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-coral px-5 text-sm font-semibold text-white transition hover:bg-[#dc654f]"
                    onClick={() => setIsRecording(true)}
                    type="button"
                  >
                    <Mic className="h-5 w-5" />
                    Start
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside className="grid content-start gap-4 rounded-lg border border-ink/10 bg-ink p-5 text-white shadow-panel sm:p-6">
            <div>
              <p className="text-sm font-semibold uppercase text-mint">Current meeting</p>
              <h2 className="mt-2 break-words text-2xl font-semibold">{meetingTitle}</h2>
            </div>

            <dl className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3 border-t border-white/12 pt-3">
                <dt className="text-white/65">Status</dt>
                <dd className="font-semibold">{recordingStatus}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/12 pt-3">
                <dt className="text-white/65">Language</dt>
                <dd className="font-semibold">{language}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/12 pt-3">
                <dt className="text-white/65">Duration</dt>
                <dd className="font-mono font-semibold">{formatDuration(elapsedSeconds)}</dd>
              </div>
            </dl>

            <div className="rounded-md bg-white/9 p-4 text-sm leading-6 text-white/78">
              Saved meetings will store title, date, duration, transcript, summary,
              action items, decisions, and topics.
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
