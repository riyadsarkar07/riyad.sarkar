"use client";

import { useEffect, useState } from "react";
import { CloudRain, CloudSun, Loader2, Sun } from "lucide-react";

interface WeatherData {
  temperature: number;
  condition: "clear" | "cloudy" | "rain";
  description: string;
}

/**
 * Weather widget for Dhaka via Open-Meteo (no API key required).
 * Silently falls back to a graceful state on failure.
 */
export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=23.8103&longitude=90.4125&current_weather=true&timezone=Asia%2FDhaka",
      { signal: controller.signal },
    )
      .then((res) => res.json())
      .then((data) => {
        const code = data?.current_weather?.weathercode ?? 1;
        const temp = data?.current_weather?.temperature ?? null;
        if (temp === null) return;
        const condition =
          code === 0
            ? "clear"
            : code <= 3
              ? "cloudy"
              : "rain";
        setWeather({
          temperature: Math.round(temp),
          condition,
          description:
            condition === "clear"
              ? "Clear skies"
              : condition === "cloudy"
                ? "Partly cloudy"
                : "Rain expected",
        });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  if (loading) {
    return (
      <div className="glass flex h-full min-h-[88px] items-center gap-3 rounded-[1.2rem] px-5 py-4">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
        <span className="text-sm text-muted-foreground">Loading weather…</span>
      </div>
    );
  }

  if (!weather) return null;

  const Icon =
    weather.condition === "clear"
      ? Sun
      : weather.condition === "rain"
        ? CloudRain
        : CloudSun;

  return (
    <div className="glass hover-lift flex h-full min-h-[88px] items-center gap-3 rounded-[1.2rem] px-5 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-sky-400/20 text-amber-500">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-display text-xl font-bold leading-none">{weather.temperature}°C</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{weather.description} · Dhaka</p>
      </div>
    </div>
  );
}
