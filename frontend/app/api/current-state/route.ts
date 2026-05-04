import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const time = url.searchParams.get("time") ?? "08:30";
  const character = url.searchParams.get("character");

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

  const upstreamUrl = new URL(`${baseUrl}/current-state`);
  upstreamUrl.searchParams.set("time", time);

  if (character) {
    upstreamUrl.searchParams.set("character", character);
  }

  const upstream = await fetch(upstreamUrl.toString(), {
    // Prevent Next.js from caching in dev / future prod unless we choose to
    cache: "no-store",
  });

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}