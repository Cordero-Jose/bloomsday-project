import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const time = url.searchParams.get("time") ?? "08:30";

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

  const upstream = await fetch(`${baseUrl}/current-state?time=${encodeURIComponent(time)}`, {
    // Prevent Next.js from caching in dev / future prod unless we choose to
    cache: "no-store",
  });

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}