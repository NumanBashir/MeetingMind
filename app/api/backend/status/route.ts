import { NextResponse } from "next/server";
import { getPublicEnvStatus } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const envStatus = getPublicEnvStatus();

  if (!envStatus.isConfigured) {
    return NextResponse.json({
      configured: false,
      connected: false,
      missingKeys: envStatus.missingKeys,
      message: "Supabase environment variables are missing.",
    });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("meetings").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        {
          configured: true,
          connected: false,
          missingKeys: [],
          message: error.message,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      configured: true,
      connected: true,
      missingKeys: [],
      message: "Supabase connection is available.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        connected: false,
        missingKeys: [],
        message: error instanceof Error ? error.message : "Unknown Supabase connection error.",
      },
      { status: 500 },
    );
  }
}
