import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

type GenerateNotesRequestBody = {
  meetingId?: string;
};

type GeneratedNotes = {
  summary: string;
  actionItems: string[];
  decisions: string[];
  topics: string[];
};

const allowedNotesModels = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"] as const;
type NotesModel = (typeof allowedNotesModels)[number];

function getNotesModel(): NotesModel {
  const model = process.env.OPENAI_NOTES_MODEL ?? "gpt-4o-mini";

  if (allowedNotesModels.includes(model as NotesModel)) {
    return model as NotesModel;
  }

  return "gpt-4o-mini";
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

function parseGeneratedNotes(content: string): GeneratedNotes {
  const parsed = JSON.parse(content) as Partial<GeneratedNotes>;

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    actionItems: Array.isArray(parsed.actionItems)
      ? parsed.actionItems.filter((item): item is string => typeof item === "string")
      : [],
    decisions: Array.isArray(parsed.decisions)
      ? parsed.decisions.filter((item): item is string => typeof item === "string")
      : [],
    topics: Array.isArray(parsed.topics)
      ? parsed.topics.filter((item): item is string => typeof item === "string")
      : [],
  };
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

  const body = (await request.json()) as GenerateNotesRequestBody;

  if (!body.meetingId) {
    return NextResponse.json({ error: "meetingId is required." }, { status: 400 });
  }

  const supabase = createAuthedSupabaseClient(accessToken);
  const { data: transcript, error: transcriptError } = await supabase
    .from("transcripts")
    .select("meeting_id, content")
    .eq("meeting_id", body.meetingId)
    .single();

  if (transcriptError || !transcript?.content.trim()) {
    return NextResponse.json(
      { error: transcriptError?.message ?? "Generate or save a transcript first." },
      { status: 400 },
    );
  }

  const model = getNotesModel();
  const openai = new OpenAI({ apiKey });
  let notes: GeneratedNotes;

  try {
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "Generate concise meeting notes from the transcript. Return only valid JSON with keys summary, actionItems, decisions, and topics. Each list must be an array of strings.",
        },
        {
          role: "user",
          content: transcript.content,
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    });

    notes = parseGeneratedNotes(response.output_text);
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      const message =
        error.code === "insufficient_quota"
          ? "OpenAI quota is unavailable. Add billing credits or increase your API budget, then try again."
          : error.message;

      return NextResponse.json({ error: message }, { status: error.status ?? 502 });
    }

    return NextResponse.json({ error: "Could not generate meeting notes." }, { status: 502 });
  }

  const updatedAt = new Date().toISOString();
  const { error: notesError } = await supabase.from("meeting_notes").upsert({
    meeting_id: transcript.meeting_id,
    summary: notes.summary,
    decisions: notes.decisions,
    topics: notes.topics,
    updated_at: updatedAt,
  });

  if (notesError) {
    return NextResponse.json({ error: notesError.message }, { status: 502 });
  }

  const { error: deleteActionItemsError } = await supabase
    .from("action_items")
    .delete()
    .eq("meeting_id", transcript.meeting_id);

  if (deleteActionItemsError) {
    return NextResponse.json({ error: deleteActionItemsError.message }, { status: 502 });
  }

  if (notes.actionItems.length > 0) {
    const { error: actionItemsError } = await supabase.from("action_items").insert(
      notes.actionItems.map((text) => ({
        meeting_id: transcript.meeting_id,
        text,
      })),
    );

    if (actionItemsError) {
      return NextResponse.json({ error: actionItemsError.message }, { status: 502 });
    }
  }

  return NextResponse.json({
    meetingId: transcript.meeting_id,
    model,
    notes,
    updatedAt,
  });
}
