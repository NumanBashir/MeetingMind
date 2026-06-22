import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

type TranscribeRequestBody = {
  meetingId?: string;
};

const allowedTranscriptionModels = [
  "gpt-4o-mini-transcribe",
  "gpt-4o-transcribe",
  "whisper-1",
] as const;

type TranscriptionModel = (typeof allowedTranscriptionModels)[number];

function getTranscriptionModel(): TranscriptionModel {
  const model = process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe";

  if (allowedTranscriptionModels.includes(model as TranscriptionModel)) {
    return model as TranscriptionModel;
  }

  return "gpt-4o-mini-transcribe";
}

function createAuthedSupabaseClient(accessToken: string) {
  const { supabaseUrl, supabasePublishableKey } = requirePublicSupabaseEnv();

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is missing from the server environment." },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!accessToken) {
    return NextResponse.json({ error: "Missing Supabase access token." }, { status: 401 });
  }

  const body = (await request.json()) as TranscribeRequestBody;

  if (!body.meetingId) {
    return NextResponse.json({ error: "meetingId is required." }, { status: 400 });
  }

  const supabase = createAuthedSupabaseClient(accessToken);
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", body.meetingId)
    .single();

  if (meetingError || !meeting) {
    return NextResponse.json(
      { error: meetingError?.message ?? "Meeting was not found." },
      { status: 404 },
    );
  }

  if (!meeting.audio_path) {
    return NextResponse.json({ error: "Meeting does not have saved audio." }, { status: 400 });
  }

  const { data: audioBlob, error: downloadError } = await supabase.storage
    .from("meeting-audio")
    .download(meeting.audio_path);

  if (downloadError || !audioBlob) {
    return NextResponse.json(
      { error: downloadError?.message ?? "Could not download meeting audio." },
      { status: 502 },
    );
  }

  const fileName = meeting.audio_path.split("/").at(-1) ?? "meeting-audio.webm";
  const audioFile = new File([audioBlob], fileName, {
    type: meeting.audio_mime_type ?? audioBlob.type,
  });
  const openai = new OpenAI({ apiKey });
  const transcriptionModel = getTranscriptionModel();
  let transcription: string;

  try {
    transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: transcriptionModel,
      response_format: "text",
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      const message =
        error.code === "insufficient_quota"
          ? "OpenAI quota is unavailable. Add billing credits or increase your API budget, then try again."
          : error.message;

      return NextResponse.json({ error: message }, { status: error.status ?? 502 });
    }

    return NextResponse.json(
      { error: "OpenAI transcription failed. Try again later." },
      { status: 502 },
    );
  }

  const transcriptText = transcription;

  const { error: transcriptError } = await supabase.from("transcripts").upsert({
    meeting_id: meeting.id,
    content: transcriptText,
    updated_at: new Date().toISOString(),
  });

  if (transcriptError) {
    return NextResponse.json({ error: transcriptError.message }, { status: 502 });
  }

  return NextResponse.json({
    meetingId: meeting.id,
    model: transcriptionModel,
    transcript: transcriptText,
  });
}
