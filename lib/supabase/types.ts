export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      meetings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          duration_seconds: number;
          language: string;
          audio_path: string | null;
          audio_mime_type: string | null;
          audio_size_bytes: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
          duration_seconds?: number;
          language: string;
          audio_path?: string | null;
          audio_mime_type?: string | null;
          audio_size_bytes?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          duration_seconds?: number;
          language?: string;
          audio_path?: string | null;
          audio_mime_type?: string | null;
          audio_size_bytes?: number | null;
        };
      };
      transcripts: {
        Row: {
          meeting_id: string;
          content: string;
          speaker_segments: Json | null;
          updated_at: string;
        };
        Insert: {
          meeting_id: string;
          content?: string;
          speaker_segments?: Json | null;
          updated_at?: string;
        };
        Update: {
          meeting_id?: string;
          content?: string;
          speaker_segments?: Json | null;
          updated_at?: string;
        };
      };
      meeting_notes: {
        Row: {
          meeting_id: string;
          summary: string | null;
          decisions: string[];
          topics: string[];
          updated_at: string;
        };
        Insert: {
          meeting_id: string;
          summary?: string | null;
          decisions?: string[];
          topics?: string[];
          updated_at?: string;
        };
        Update: {
          meeting_id?: string;
          summary?: string | null;
          decisions?: string[];
          topics?: string[];
          updated_at?: string;
        };
      };
      action_items: {
        Row: {
          id: string;
          meeting_id: string;
          text: string;
          status: "open" | "done";
          assignee: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          text: string;
          status?: "open" | "done";
          assignee?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          text?: string;
          status?: "open" | "done";
          assignee?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      action_item_status: "open" | "done";
    };
    CompositeTypes: Record<string, never>;
  };
};
