import { NextRequest, NextResponse } from "next/server";
import { saveHumanLabel } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pokemon_id, label_key, value } = body;

  if (!pokemon_id || !label_key || value === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await saveHumanLabel(pokemon_id, label_key, String(value));
  return NextResponse.json({ ok: true });
}
