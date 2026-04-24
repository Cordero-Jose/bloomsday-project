"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const CHARACTER_DISPLAY_NAMES: Record<string, string> = {
  leopold: "Leopold Bloom",
  stephen: "Stephen Dedalus",
  molly: "Molly Bloom",
  buck_mulligan: "Buck Mulligan",
  haines: "Haines",
};

function getCharacterDisplayName(characterId: string) {
  return (
    CHARACTER_DISPLAY_NAMES[characterId] ??
    characterId
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

type Coords = { lat: number; lon: number };

type CharacterState = {
  status: string;
  event?: {
    episode: string;
    location: string;
    coords?: Coords | null;
  };
  message?: string;
};

type CanonEvent = {
  id: string;
  episode_id?: string;
  summary?: string;
  time?: {
    explicit_bucket?: string | null;
    episode_label?: string | null;
  };
  location?: {
    location_id?: string | null;
  };
  claims?: any[];
};

function extractCitations(ev: any) {
  const claims = Array.isArray(ev?.claims) ? ev.claims : [];
  const citations: Array<{
    source_id?: string;
    anchor_id?: string;
    anchor_text?: string;
  }> = [];

  for (const claim of claims) {
    const cits = Array.isArray(claim?.citations) ? claim.citations : [];
    for (const c of cits) {
      citations.push({
        source_id: c?.source_id,
        anchor_id: c?.episode_anchor?.anchor_id,
        anchor_text: c?.episode_anchor?.anchor_text,
      });
    }
  }

  return citations;
}

export default function CharacterPage() {
  const params = useParams();
  const character = useMemo(() => String(params.character ?? ""), [params]);
  const displayName = useMemo(() => getCharacterDisplayName(character), [character]);

  // Core state
  const [time, setTime] = useState("08:30");
  const [data, setData] = useState<any>(null);

  // Canon panel
  const [canonMode, setCanonMode] = useState(false);
  const [canonEvents, setCanonEvents] = useState<CanonEvent[]>([]);

  // Fetch current-state for the slider time
  useEffect(() => {
    fetch(`/api/current-state?time=${time}`)
      .then((res) => res.json())
      .then(setData);
  }, [time]);

  // Load canon events (Telemachus for now)
  useEffect(() => {
    fetch(`/api/v1/events?episode=telemachus`)
      .then((res) => res.json())
      .then((json) => setCanonEvents(json.events ?? []))
      .catch(() => setCanonEvents([]));
  }, []);

  const characterState: CharacterState | null = data?.characters?.[character] ?? null;

  return (
    <main className="min-h-screen bg-[#0b1f3a] text-white flex flex-col items-center p-8">
      {/* Top bar */}
      <div className="w-full max-w-6xl flex items-center justify-between mb-6">
        <Link href="/" className="text-sm opacity-80 hover:opacity-100">
          ← Back
        </Link>

        <h1 className="text-2xl font-serif tracking-wide">
          {displayName}
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCanonMode((v) => !v)}
            className="text-sm bg-white/10 hover:bg-white/15 transition px-3 py-2 rounded-lg"
          >
            {canonMode ? "Hide canon" : "Canon mode"}
          </button>

        </div>
      </div>

      {/* Map */}
      <div className="w-full max-w-6xl rounded-2xl overflow-hidden shadow-lg bg-black/20 mb-6 border border-white/10">
        <iframe
          src="https://www.google.com/maps/d/embed?mid=1S3bB22Dr4sBjckxj_jI17tMnWg0&ehbc=2E312F"
          title="Bloomsday Character Map"
          className="w-full h-[480px]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* Slider */}
      <div className="w-full max-w-md mb-8">
        <input
          type="range"
          min="0"
          max="1439"
          value={timeToMinutes(time)}
          onChange={(e) => setTime(minutesToTime(Number(e.target.value)))}
          className="w-full"
        />
        <p className="text-center mt-2 text-sm opacity-80">{time}</p>
      </div>

      {/* Current state card */}
      <div className="w-full max-w-3xl bg-white/10 backdrop-blur-lg p-6 rounded-2xl shadow-lg text-center">
        {characterState ? (
          characterState.status === "active" ? (
            <>
              <p className="text-sm opacity-80">Active</p>
              <p className="text-xl mt-2">{characterState.event?.episode}</p>
              <p className="text-sm opacity-70">{characterState.event?.location}</p>
              {characterState.event?.coords ? (
                <p className="text-xs opacity-60 mt-2">
                  coords: {characterState.event.coords.lat.toFixed(4)},{" "}
                  {characterState.event.coords.lon.toFixed(4)}
                </p>
              ) : (
                <p className="text-xs opacity-60 mt-2">coords: (none)</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm opacity-80">Inactive</p>
              <p className="text-sm italic opacity-80 mt-2">
                {characterState.message}
              </p>
            </>
          )
        ) : (
          <p className="text-sm opacity-70">
            Character not found in current-state response.
          </p>
        )}
      </div>

      {/* Canon panel */}
      {canonMode && (
        <div className="w-full max-w-6xl mt-10 bg-white/5 backdrop-blur-lg p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Canon (v1) — Telemachus</h2>

          {canonEvents.length === 0 ? (
            <p className="text-sm opacity-70">No canon events loaded.</p>
          ) : (
            <div className="space-y-4">
              {canonEvents.map((ev) => {
                const citations = extractCitations(ev);

                return (
                  <div key={ev.id} className="p-4 rounded-xl bg-white/5">
                    <p className="text-sm opacity-70">
                      {ev.time?.explicit_bucket ?? "unknown time"}
                      {ev.time?.episode_label ? ` · ${ev.time.episode_label}` : ""}
                    </p>
                    <p className="text-base">{ev.summary ?? "(no summary)"}</p>
                    <p className="text-xs opacity-70 mt-1">
                      location_id: {ev.location?.location_id ?? "unknown"}
                    </p>

                    <div className="mt-3 space-y-2">
                      <details>
                        <summary className="cursor-pointer text-sm opacity-90">
                          Evidence / citations
                        </summary>

                        {citations.length === 0 ? (
                          <p className="text-xs opacity-70 mt-2">
                            No citations found.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {citations.map((c, idx) => (
                              <li key={`${ev.id}-cit-${idx}`} className="text-xs opacity-80">
                                <span className="opacity-70">
                                  {c.source_id ?? "source"}
                                  {c.anchor_id ? ` · ${c.anchor_id}` : ""}
                                </span>
                                {c.anchor_text ? (
                                  <div className="mt-1 italic">“{c.anchor_text}”</div>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </details>

                      <details>
                        <summary className="cursor-pointer text-xs opacity-60">
                          Debug (raw JSON)
                        </summary>
                        <pre className="text-xs opacity-70 mt-2 whitespace-pre-wrap">
                          {JSON.stringify(ev.claims ?? [], null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}