"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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

function formatTimeInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function slugifyEpisode(episode: string) {
  return episode
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earthRadiusMeters = 6_371_000;
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

function interpolatePathPoint(
  path: Array<{ lat: number; lng: number }>,
  progress: number,
) {
  if (path.length === 0) {
    return null;
  }

  if (path.length === 1) {
    return path[0];
  }

  const segmentLengths = path.slice(1).map((point, index) => haversineDistance(path[index], point));
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);

  if (totalLength === 0) {
    return path[0];
  }

  const targetDistance = totalLength * progress;
  let coveredDistance = 0;

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index];
    const segmentStart = path[index];
    const segmentEnd = path[index + 1];

    if (coveredDistance + segmentLength >= targetDistance) {
      const segmentProgress = segmentLength === 0 ? 0 : (targetDistance - coveredDistance) / segmentLength;

      return {
        lat: segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * segmentProgress,
        lng: segmentStart.lng + (segmentEnd.lng - segmentStart.lng) * segmentProgress,
      };
    }

    coveredDistance += segmentLength;
  }

  return path[path.length - 1];
}

// Google Maps configuration
const GOOGLE_MAPS_API_KEY = "AIzaSyD_hRUxCbfp9oAUpzkGXVyosIITVYlRrrM";
const DUBLIN_CENTER = { lat: 53.3398, lng: -6.2603 };

// Dublin locations from the timeline
const DUBLIN_LOCATIONS = {
  "Martello Tower": { lat: 53.2893, lon: -6.1133, icon: "🏰" },
  "7 Eccles Street": { lat: 53.3609, lon: -6.2715, icon: "🏠" },
  "Post Office": { lat: 53.3498, lon: -6.2603, icon: "📮" },
  "Glasnevin Cemetery": { lat: 53.3658, lon: -6.2763, icon: "⛪" },
  "Davy Byrne's Pub": { lat: 53.3422, lon: -6.2590, icon: "🍺" },
  "National Library": { lat: 53.3409, lon: -6.2546, icon: "📚" },
  "Sandymount Strand": { lat: 53.3350, lon: -6.2110, icon: "🏖️" },
  "Dalkey School": { lat: 53.2770, lon: -6.1030, icon: "🎓" },
  "Nighttown": { lat: 53.3500, lon: -6.2430, icon: "🌙" },
};

type Coords = { lat: number; lon: number };

type CharacterState = {
  status: string;
  event?: {
    episode: string;
    location: string;
    description?: string;
    coords?: Coords | null;
  };
  next_event?: {
    episode: string;
    location: string;
    description?: string;
    coords?: Coords | null;
  } | null;
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

  const DUBLIN_TIME_ZONE = "Europe/Dublin";
  const COSTA_RICA_TIME_ZONE = "America/Costa_Rica";

  // Core state
  const [clockNow, setClockNow] = useState(() => new Date());
  const [time, setTime] = useState(() => formatTimeInZone(new Date(), DUBLIN_TIME_ZONE));
  const [data, setData] = useState<any>(null);

  // Canon panel
  const [canonMode, setCanonMode] = useState(false);
  const [canonEvents, setCanonEvents] = useState<CanonEvent[]>([]);
  const [useGeneratedTimeline, setUseGeneratedTimeline] = useState(true);

  // Map refs
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const travelDotRef = useRef<any>(null);
  const travelLineRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const locationMarkersRef = useRef<Map<string, any>>(new Map());
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const travelFrameRef = useRef<number | null>(null);
  const routeRequestIdRef = useRef(0);

  const currentCostaRicaTime = useMemo(
    () => formatTimeInZone(clockNow, COSTA_RICA_TIME_ZONE),
    [clockNow],
  );
  const currentDublinTime = useMemo(
    () => formatTimeInZone(clockNow, DUBLIN_TIME_ZONE),
    [clockNow],
  );

  // Keep the displayed live clock moving.
  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Load Google Maps SDK and initialize map
  useEffect(() => {
    if (mapRef.current) return; // Already initialized

    const loadMapsScript = () => {
      if ((window as any).google?.maps) {
        initializeMap();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker`;
      script.async = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapContainerRef.current || mapRef.current) return;

      const map = new (window as any).google.maps.Map(mapContainerRef.current, {
        zoom: 14,
        center: DUBLIN_CENTER,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a1a" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#e0e0e0" }] },
          {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#e0e0e0" }],
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
          },
        ],
      });

      mapRef.current = map;

      // Add location landmarks
      Object.entries(DUBLIN_LOCATIONS).forEach(([locationName, locationData]) => {
        const infoWindow = new (window as any).google.maps.InfoWindow({
          content: `<div style="color: #000; font-weight: bold; font-size: 14px; padding: 4px 0;">${locationData.icon} ${locationName}</div>`,
        });

        const marker = new (window as any).google.maps.Marker({
          position: { lat: locationData.lat, lng: locationData.lon },
          map,
          title: locationName,
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#3b82f6",
            fillOpacity: 0.8,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });

        locationMarkersRef.current.set(locationName, marker);
      });
    };

    loadMapsScript();
  }, []);

  // Fetch current-state for the selected character and slider time.
  useEffect(() => {
    let cancelled = false;

    const timelineMode = useGeneratedTimeline ? "generated" : "standard";
    fetch(
      `/api/current-state?character=${encodeURIComponent(character)}&time=${encodeURIComponent(time)}&mode=${encodeURIComponent(timelineMode)}`,
    )
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setData(json);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [character, time, useGeneratedTimeline]);

  const characterState: CharacterState | null = data?.event ?? data?.characters?.[character] ?? null;
  const activeEpisodeId = useMemo(
    () => slugifyEpisode(characterState?.event?.episode ?? ""),
    [characterState?.event?.episode],
  );

  // Load canon events for the active chapter when canon mode is on.
  useEffect(() => {
    let cancelled = false;

    if (!canonMode || !activeEpisodeId) {
      setCanonEvents([]);
      return undefined;
    }

    fetch(`/api/v1/events?episode=${encodeURIComponent(activeEpisodeId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setCanonEvents(json.events ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCanonEvents([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeEpisodeId, canonMode]);

  // Update map marker when character coords change
  useEffect(() => {
    if (!mapRef.current) return;

    if (travelFrameRef.current) {
      window.cancelAnimationFrame(travelFrameRef.current);
      travelFrameRef.current = null;
    }

    if (travelLineRef.current) {
      travelLineRef.current.setMap(null);
      travelLineRef.current = null;
    }

    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }

    if (travelDotRef.current) {
      travelDotRef.current.setMap(null);
      travelDotRef.current = null;
    }

    routeRequestIdRef.current += 1;
    const routeRequestId = routeRequestIdRef.current;

    const coords = characterState?.event?.coords;
    const location = characterState?.event?.location;
    const nextCoords = characterState?.next_event?.coords;

    if (coords) {
      const position = { lat: coords.lat, lng: coords.lon };

      if (!markerRef.current) {
        // Create info window for character marker
        const characterInfoWindow = new (window as any).google.maps.InfoWindow({
          content: `<div style="color: #000; font-weight: bold; font-size: 14px; padding: 4px 0;"><span style="font-size: 16px;">👤</span> ${displayName}<br/><span style="font-size: 12px; opacity: 0.8;">${location || "Unknown location"}</span></div>`,
        });

        // Create new marker
        markerRef.current = new (window as any).google.maps.Marker({
          position,
          map: mapRef.current,
          title: location || "Character location",
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3,
          },
        });

        markerRef.current.addListener("click", () => {
          characterInfoWindow.open(mapRef.current, markerRef.current);
        });

        markerRef.current.characterInfoWindow = characterInfoWindow;
      } else {
        // Update existing marker
        markerRef.current.setPosition(position);
        markerRef.current.setTitle(location || "Character location");
        
        // Update info window content
        if (markerRef.current.characterInfoWindow) {
          markerRef.current.characterInfoWindow.setContent(
            `<div style="color: #000; font-weight: bold; font-size: 14px; padding: 4px 0;"><span style="font-size: 16px;">👤</span> ${displayName}<br/><span style="font-size: 12px; opacity: 0.8;">${location || "Unknown location"}</span></div>`
          );
        }
      }

      // Pan map to marker
      mapRef.current.panTo(position);

      // Draw travel path to the next waypoint / stop and animate a dot along it.
      if (nextCoords) {
        const nextPosition = { lat: nextCoords.lat, lng: nextCoords.lon };

        const directionsService = new (window as any).google.maps.DirectionsService();
        directionsRendererRef.current = new (window as any).google.maps.DirectionsRenderer({
          map: mapRef.current,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#f59e0b",
            strokeOpacity: 0.9,
            strokeWeight: 4,
          },
        });

        directionsService.route(
          {
            origin: position,
            destination: nextPosition,
            travelMode: (window as any).google.maps.TravelMode.WALKING,
          },
          (result: any, status: any) => {
            if (routeRequestIdRef.current !== routeRequestId) {
              return;
            }

            const routePath =
              result?.routes?.[0]?.overview_path?.map((point: any) => ({
                lat: typeof point.lat === "function" ? point.lat() : point.lat,
                lng: typeof point.lng === "function" ? point.lng() : point.lng,
              })) ?? [];

            if (
              status === (window as any).google.maps.DirectionsStatus.OK &&
              result &&
              directionsRendererRef.current
            ) {
              directionsRendererRef.current.setDirections(result);
            } else {
              travelLineRef.current = new (window as any).google.maps.Polyline({
                path: [position, nextPosition],
                geodesic: true,
                strokeColor: "#f59e0b",
                strokeOpacity: 0.9,
                strokeWeight: 4,
                map: mapRef.current,
              });
            }

            const animationPath = routePath.length > 1 ? routePath : [position, nextPosition];

            if (travelDotRef.current) {
              travelDotRef.current.setMap(null);
              travelDotRef.current = null;
            }

            travelDotRef.current = new (window as any).google.maps.Marker({
              position,
              map: mapRef.current,
              title: "Travel path",
              icon: {
                path: (window as any).google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#fbbf24",
                fillOpacity: 1,
                strokeColor: "#111827",
                strokeWeight: 2,
              },
              zIndex: 999,
            });

            const start = performance.now();
            const duration = 12000;

            const animate = (timestamp: number) => {
              if (!travelDotRef.current || routeRequestIdRef.current !== routeRequestId) return;

              const elapsed = (timestamp - start) % duration;
              const t = elapsed / duration;
              const pathPoint = interpolatePathPoint(animationPath, t);

              if (pathPoint) {
                travelDotRef.current.setPosition(pathPoint);
              }

              travelFrameRef.current = window.requestAnimationFrame(animate);
            };

            travelFrameRef.current = window.requestAnimationFrame(animate);
          },
        );
      }
    } else if (markerRef.current) {
      // Remove marker if no coords
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  }, [characterState?.event?.coords, characterState?.event?.location, characterState?.next_event?.coords, displayName]);

  return (
    <main className="min-h-screen bg-[#0b1f3a] text-white flex flex-col items-center p-8">
      {/* Top bar */}
      <div className="w-full max-w-6xl flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm opacity-80 hover:opacity-100">
            ← Back
          </Link>

          <h1 className="text-2xl font-serif tracking-wide">
            {displayName}
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseGeneratedTimeline((v) => !v)}
              className={`text-sm transition px-3 py-2 rounded-lg ${useGeneratedTimeline ? "bg-emerald-500/30 hover:bg-emerald-500/40" : "bg-white/10 hover:bg-white/15"}`}
            >
              {useGeneratedTimeline ? "Route path on" : "Standard timeline on"}
            </button>

            <button
              onClick={() => setCanonMode((v) => !v)}
              className="text-sm bg-white/10 hover:bg-white/15 transition px-3 py-2 rounded-lg"
            >
              {canonMode ? "Hide canon" : "Canon mode"}
            </button>

            <button
              onClick={() => setTime(formatTimeInZone(new Date(), DUBLIN_TIME_ZONE))}
              className="text-sm bg-white/10 hover:bg-white/15 transition px-3 py-2 rounded-lg"
            >
              Sync to now
            </button>

          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85">
          <p>
            Costa Rica now: <span className="font-medium text-white">{currentCostaRicaTime}</span>
            <span className="mx-2 opacity-50">·</span>
            Dublin now: <span className="font-medium text-white">{currentDublinTime}</span>
          </p>
          <p className="mt-1 text-xs opacity-70">
            The slider uses Dublin time, so the selected character stays aligned with the chapter timeline.
            {useGeneratedTimeline
              ? " 15-minute waypoint data is enabled, so the map shows a smoother route between stops."
              : " Standard timeline data is enabled, so the map jumps between major story anchors."}
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="w-full max-w-6xl rounded-2xl overflow-hidden shadow-lg bg-black/20 mb-6 border border-white/10">
        <div
          ref={mapContainerRef}
          className="w-full h-[480px]"
          style={{ background: "#0b1f3a" }}
        />
      </div>

      <div className="w-full max-w-6xl mb-6 flex flex-wrap items-center gap-3 text-xs text-white/80">
        <span className="rounded-full bg-red-500/20 px-3 py-1 border border-red-400/30">Red dot = current character position</span>
        <span className="rounded-full bg-amber-500/20 px-3 py-1 border border-amber-400/30">Amber dot + line = route path between stops</span>
        <span className="rounded-full bg-blue-500/20 px-3 py-1 border border-blue-400/30">Blue dots = Dublin landmarks</span>
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
        <p className="text-center mt-2 text-sm opacity-80">Dublin time: {time}</p>
      </div>

      {/* Current state card */}
      <div className="w-full max-w-3xl bg-white/10 backdrop-blur-lg p-6 rounded-2xl shadow-lg text-center">
        {characterState ? (
          characterState.status === "active" ? (
            <>
              <p className="text-sm opacity-80">Active chapter</p>
              <p className="text-xl mt-2">{characterState.event?.episode ?? "Unknown chapter"}</p>
              <p className="text-sm opacity-70 mt-1">{characterState.event?.location}</p>
              {characterState.event?.description ? (
                <p className="text-sm opacity-80 mt-3">{characterState.event.description}</p>
              ) : null}
              {characterState.next_event?.location ? (
                <p className="text-sm opacity-70 mt-2">
                  Next stop: {characterState.next_event.location}
                  {characterState.next_event.description ? ` · ${characterState.next_event.description}` : ""}
                </p>
              ) : null}
              {characterState.event?.coords ? (
                <p className="text-xs opacity-60 mt-2">
                  coords: {characterState.event.coords.lat.toFixed(4)},{" "}
                  {characterState.event.coords.lon.toFixed(4)}
                </p>
              ) : (
                <p className="text-xs opacity-60 mt-2">coords: (none)</p>
              )}
              <p className="mt-4 text-xs opacity-70">
                Canonical time: {time} · use the slider to move the character through time and space.
              </p>
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
          <h2 className="text-lg font-semibold mb-2">Canon / chapter view</h2>
          <p className="text-sm opacity-75 mb-4">
            Chapter: {characterState?.event?.episode ?? "Unknown"} · move the slider to shift the character’s position within the narrative timeline.
          </p>

          {canonEvents.length === 0 ? (
            <p className="text-sm opacity-70">No canon events loaded for this chapter yet.</p>
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