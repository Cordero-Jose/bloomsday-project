"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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

const DEFAULT_AMBIENT_VOLUME = 0.18;
const WAVES_ENABLED_STORAGE_KEY = "bloomsday:waves-enabled";
const WAVES_VOLUME_STORAGE_KEY = "bloomsday:waves-volume";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [isWavesPlaying, setIsWavesPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [wavesEnabled, setWavesEnabled] = useState(true);
  const [ambientVolume, setAmbientVolume] = useState(DEFAULT_AMBIENT_VOLUME);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);

  // Home has no slider; pick a default “starting view” time.
  // (We can change this later to “now”, or persist last time in localStorage.)
  const time = "08:30";

  const clearFadeInterval = useCallback(() => {
    if (fadeIntervalRef.current !== null) {
      window.clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const fadeTo = useCallback(
    (targetVolume: number, durationMs: number, onDone?: () => void) => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      clearFadeInterval();
      const startVolume = audio.volume;
      const delta = targetVolume - startVolume;
      const stepMs = 50;
      const steps = Math.max(1, Math.ceil(durationMs / stepMs));
      let currentStep = 0;

      fadeIntervalRef.current = window.setInterval(() => {
        currentStep += 1;
        const progress = Math.min(1, currentStep / steps);
        audio.volume = Math.min(1, Math.max(0, startVolume + delta * progress));

        if (progress >= 1) {
          clearFadeInterval();
          onDone?.();
        }
      }, stepMs);
    },
    [clearFadeInterval],
  );

  const playWaves = useCallback(async (attemptAutoplay = false) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    clearFadeInterval();
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;

    try {
      if (attemptAutoplay) {
        // Muted play tends to satisfy autoplay policies, then we fade in audibly.
        audio.muted = true;
      }

      await audio.play();

      if (attemptAutoplay) {
        audio.muted = false;
      }

      setAutoplayBlocked(false);
      setIsWavesPlaying(true);
      fadeTo(ambientVolume, 1200);
    } catch {
      setIsWavesPlaying(false);
      setAutoplayBlocked(true);
      audio.muted = false;
    }
  }, [ambientVolume, clearFadeInterval, fadeTo]);

  const pauseWaves = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    setIsWavesPlaying(false);
    fadeTo(0, 900, () => {
      audio.pause();
    });
  }, [fadeTo]);

  const toggleWaves = useCallback(() => {
    if (isWavesPlaying) {
      setWavesEnabled(false);
      pauseWaves();
      return;
    }

    setWavesEnabled(true);
    void playWaves();
  }, [isWavesPlaying, pauseWaves, playWaves]);

  useEffect(() => {
    fetch(`/api/current-state?time=${time}`)
      .then((res) => res.json())
      .then(setData);
  }, []);

  useEffect(() => {
    const storedEnabled = window.localStorage.getItem(WAVES_ENABLED_STORAGE_KEY);
    const storedVolume = window.localStorage.getItem(WAVES_VOLUME_STORAGE_KEY);

    if (storedEnabled !== null) {
      setWavesEnabled(storedEnabled === "true");
    }

    if (storedVolume !== null) {
      const parsedVolume = Number(storedVolume);
      if (!Number.isNaN(parsedVolume)) {
        setAmbientVolume(Math.min(0.35, Math.max(0.05, parsedVolume)));
      }
    }

    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) {
      return;
    }

    window.localStorage.setItem(WAVES_ENABLED_STORAGE_KEY, String(wavesEnabled));
    window.localStorage.setItem(WAVES_VOLUME_STORAGE_KEY, String(ambientVolume));
  }, [ambientVolume, preferencesLoaded, wavesEnabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !preferencesLoaded) {
      return;
    }

    audio.volume = ambientVolume;
    if (!isWavesPlaying) {
      return;
    }

    fadeTo(ambientVolume, 250);
  }, [ambientVolume, fadeTo, isWavesPlaying, preferencesLoaded]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !preferencesLoaded) {
      return;
    }

    if (wavesEnabled) {
      void playWaves(true);
    } else {
      clearFadeInterval();
      audio.pause();
      setIsWavesPlaying(false);
    }

    return () => {
      clearFadeInterval();
      audio.pause();
    };
  }, [clearFadeInterval, playWaves, preferencesLoaded, wavesEnabled]);

  return (
    <main className="min-h-screen bg-[#0b1f3a] text-white flex flex-col items-center p-8">
      {/* Title */}
      <h1 className="text-4xl font-serif tracking-wide mb-10 text-center">
        Ulysses — A Day in Motion
      </h1>

      <div className="fixed right-4 top-4 z-20 rounded-2xl border border-white/25 bg-[#0b1f3a]/75 p-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleWaves}
            className="rounded-full border border-white/35 bg-white/10 px-3 py-1.5 text-xs tracking-wide transition hover:bg-white/20"
          >
            {isWavesPlaying ? "Pause" : "Play"}
          </button>

          <label htmlFor="waves-volume" className="text-xs text-blue-100/90">
            Volume
          </label>
          <input
            id="waves-volume"
            type="range"
            min={5}
            max={35}
            step={1}
            value={Math.round(ambientVolume * 100)}
            onChange={(event) => {
              const nextVolume = Number(event.target.value) / 100;
              setAmbientVolume(nextVolume);
            }}
            className="h-1.5 w-20 accent-blue-300"
            aria-label="Wave ambience volume"
          />
        </div>
        {autoplayBlocked && (
          <p className="mt-2 max-w-[220px] text-[11px] text-blue-100/90">
            Autoplay was blocked. Press Play to start ocean ambience.
          </p>
        )}
      </div>

      <audio ref={audioRef} src="/sounds/ocean-waves.mp3" aria-hidden="true" />

      {/* Visual block */}
      <div className="relative w-full max-w-2xl h-40 mb-12">
        {/* Waves */}
        <div className="absolute bottom-0 w-full h-20 bg-blue-900/40 rounded-t-full blur-xl animate-pulse"></div>

        {/* Tower */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
          <svg width="120" height="140" viewBox="0 0 120 140" className="opacity-90">
            {/* Cliff */}
            <path
              d="M10 120 L110 120 L90 90 L70 100 L50 80 L30 95 Z"
              fill="#1e3a5f"
            />

            {/* Tower */}
            <rect x="45" y="40" width="30" height="60" fill="#d1d5db" />

            {/* Tower top */}
            <rect x="40" y="35" width="40" height="8" fill="#d1d5db" />
          </svg>
        </div>
      </div>

      {/* Characters (clickable) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {data?.characters &&
          Object.entries(data.characters).map(([name]: any) => {
            return (
              <Link
                key={name}
                href={`/${encodeURIComponent(name)}`}
                className="block"
              >
                <div className="w-full min-h-[130px] bg-white/10 backdrop-blur-lg p-5 rounded-2xl shadow-lg flex flex-col justify-center text-center hover:bg-white/15 transition">
                  <h2 className="text-xl">{getCharacterDisplayName(name)}</h2>
                </div>
              </Link>
            );
          })}
      </div>
    </main>
  );
}