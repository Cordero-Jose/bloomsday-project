"use client";

import { useEffect, useState } from "react";

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

type CharacterState = {
  status: string;
  event?: {
    episode: string;
    location: string;
  };
  message?: string;
};

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [time, setTime] = useState("08:30");

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/current-state?time=${time}`)
      .then((res) => res.json())
      .then(setData);
  }, [time]);

  return (
    <main className="min-h-screen bg-[#0b1f3a] text-white flex flex-col items-center p-8">

      {/* Title */}
      <h1 className="text-4xl font-serif tracking-wide mb-10 text-center">
        Ulysses — A Day in Motion
      </h1>

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

      {/* Time slider */}
      <div className="w-full flex justify-center mb-12">
        <div className="w-full max-w-md">
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
      </div>

      {/* Characters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {data?.characters &&
          Object.entries(data.characters).map(([name, value]: any) => {
            const character = value as CharacterState;

            return (
              <div
                key={name}
                className="w-full min-h-[130px] bg-white/10 backdrop-blur-lg p-5 rounded-2xl shadow-lg flex flex-col justify-center text-center"
              >
                <h2 className="text-xl capitalize mb-3">{name}</h2>

                {character.status === "active" ? (
                  <>
                    <p className="text-sm font-medium">
                      {character.event?.episode}
                    </p>
                    <p className="text-xs opacity-70">
                      {character.event?.location}
                    </p>
                  </>
                ) : (
                  <p className="text-sm italic opacity-80">
                    {character.message}
                  </p>
                )}
              </div>
            );
          })}
      </div>
    </main>
  );
}