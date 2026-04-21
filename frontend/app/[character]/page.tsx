"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

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

function latLonToXY(
  coords: Coords,
  bounds: {
    lat_top: number;
    lat_bottom: number;
    lon_left: number;
    lon_right: number;
  },
  img: { width: number; height: number }
) {
  const x01 =
    (coords.lon - bounds.lon_left) / (bounds.lon_right - bounds.lon_left);
  const y01 =
    (bounds.lat_top - coords.lat) / (bounds.lat_top - bounds.lat_bottom);

  return {
    x: x01 * img.width,
    y: y01 * img.height,
  };
}

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

  // Core state
  const [time, setTime] = useState("08:30");
  const [data, setData] = useState<any>(null);

  // Canon panel
  const [canonMode, setCanonMode] = useState(false);
  const [canonEvents, setCanonEvents] = useState<CanonEvent[]>([]);

  // Map calibration config (from /public)
  const [cal, setCal] = useState<any>(null);

  // Calibration click mode
  const [calibrateMode, setCalibrateMode] = useState(false);
  const [lastClick, setLastClick] = useState<{ xPct: number; yPct: number } | null>(
    null
  );

  // NEW: Pan/zoom state (this is the useState you couldn’t find)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

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

  // Load map calibration JSON
  useEffect(() => {
    fetch("/maps/dublin-1906.calibration.json")
      .then((r) => r.json())
      .then(setCal)
      .catch(() => setCal(null));
  }, []);

  const characterState: CharacterState | null = data?.characters?.[character] ?? null;

  const activeCoords: Coords | null =
    characterState?.status === "active"
      ? characterState.event?.coords ?? null
      : null;

  return (
    <main className="min-h-screen bg-[#0b1f3a] text-white flex flex-col items-center p-8">
      {/* Top bar */}
      <div className="w-full max-w-6xl flex items-center justify-between mb-6">
        <Link href="/" className="text-sm opacity-80 hover:opacity-100">
          ← Back
        </Link>

        <h1 className="text-2xl font-serif tracking-wide capitalize">
          {character}
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCanonMode((v) => !v)}
            className="text-sm bg-white/10 hover:bg-white/15 transition px-3 py-2 rounded-lg"
          >
            {canonMode ? "Hide canon" : "Canon mode"}
          </button>

          <button
            onClick={() => setCalibrateMode((v) => !v)}
            className="text-sm bg-white/10 hover:bg-white/15 transition px-3 py-2 rounded-lg"
          >
            {calibrateMode ? "Calibrating…" : "Calibration mode"}
          </button>

          {/* Optional: quick reset */}
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="text-sm bg-white/10 hover:bg-white/15 transition px-3 py-2 rounded-lg"
          >
            Reset view
          </button>
        </div>
      </div>

      {/* Map (pan/zoom + dot overlay + calibration click) */}
      <div className="w-full max-w-6xl rounded-2xl overflow-hidden shadow-lg bg-black/20 mb-2">
        <div
          className="relative w-full h-[420px] bg-black/10"
          onMouseDown={(e) => {
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
          }}
          onMouseMove={(e) => {
            if (!isPanning || !panStart) return;
            setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
          }}
          onMouseUp={() => {
            setIsPanning(false);
            setPanStart(null);
          }}
          onMouseLeave={() => {
            setIsPanning(false);
            setPanStart(null);
          }}
          onWheel={(e) => {
            e.preventDefault();
            const delta = -e.deltaY;
            const factor = delta > 0 ? 1.08 : 0.92;
            setZoom((z) => Math.min(6, Math.max(0.6, z * factor)));
          }}
          style={{
            cursor: isPanning ? "grabbing" : "grab",
            touchAction: "none",
          }}
        >
          {/* This inner layer is what we pan/zoom */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
            onClick={(e) => {
              // calibration click (in IMAGE coordinate space)
              if (!calibrateMode) return;

              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;

              const imgX = x / zoom;
              const imgY = y / zoom;

              if (!cal?.image?.width || !cal?.image?.height) return;

              const xPct = (imgX / cal.image.width) * 100;
              const yPct = (imgY / cal.image.height) * 100;

              setLastClick({ xPct, yPct });
            }}
          >
            <img
              src="/maps/dublin-1906.jpg"
              alt="Dublin map (c. 1906 style)"
              draggable={false}
              style={{
                width: cal?.image?.width ? `${cal.image.width}px` : "1920px",
                height: cal?.image?.height ? `${cal.image.height}px` : "1080px",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />

            {/* Dot overlay (IMAGE coordinate space) */}
            {activeCoords &&
              cal &&
              (() => {
                const { x, y } = latLonToXY(activeCoords, cal.bounds, cal.image);
                return (
                  <div
                    title={`${activeCoords.lat.toFixed(4)}, ${activeCoords.lon.toFixed(4)}`}
                    className="absolute w-4 h-4 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)] border border-white"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                );
              })()}

            {/* Calibration click marker (IMAGE coordinate space) */}
            {calibrateMode &&
              lastClick &&
              cal?.image?.width &&
              cal?.image?.height && (
                <div
                  className="absolute w-3 h-3 rounded-full bg-yellow-300 border border-black"
                  style={{
                    left: `${(lastClick.xPct / 100) * cal.image.width}px`,
                    top: `${(lastClick.yPct / 100) * cal.image.height}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                  title={`xPct=${lastClick.xPct.toFixed(2)} yPct=${lastClick.yPct.toFixed(2)}`}
                />
              )}
          </div>

          {/* HUD */}
          <div className="absolute bottom-3 right-3 text-[11px] bg-black/50 px-2 py-1 rounded">
            zoom: {zoom.toFixed(2)}
          </div>
        </div>
      </div>

      {calibrateMode && (
        <div className="w-full max-w-6xl mb-6 text-sm opacity-80">
          Tip: zoom in, then click a known landmark to record xPct/yPct.
          {lastClick ? (
            <div className="mt-2 font-mono text-xs opacity-90">
              last click: xPct={lastClick.xPct.toFixed(2)} yPct={lastClick.yPct.toFixed(2)}
            </div>
          ) : (
            <div className="mt-2 font-mono text-xs opacity-70">last click: (none)</div>
          )}
        </div>
      )}

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