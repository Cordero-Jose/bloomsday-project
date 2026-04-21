import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const episode = url.searchParams.get("episode") ?? "telemachus";

  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

  const upstream = await fetch(
    `${baseUrl}/v1/events?episode=${encodeURIComponent(episode)}`,
    { cache: "no-store" }
  );

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}