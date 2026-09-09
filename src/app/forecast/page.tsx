"use client";

import { useState } from "react";
import {
    getCurrentWeather,
    getForecast,
    friendlyErrorMessage,
    type CurrentWeatherResponse,
    type ForecastResponse,
} from "@/lib/api";

const EXAMPLE_CITIES = [
    "Jaipur",
    "Kochi",
    "Guwahati",
    "Shimla",
    "Hyderabad",
    "Pune",
];

// Interpret WMO weather codes (Open-Meteo standard)
function getWeatherDescription(code?: number): { label: string; iconType: string } {
    if (code === undefined || code === null) return { label: "Condition unavailable", iconType: "cloud" };
    if (code === 0) return { label: "Clear sky", iconType: "sun" };
    if (code === 1) return { label: "Mainly clear", iconType: "sun-cloud" };
    if (code === 2) return { label: "Partly cloudy", iconType: "cloud" };
    if (code === 3) return { label: "Overcast", iconType: "cloud" };
    if (code >= 45 && code <= 48) return { label: "Fog / mist", iconType: "fog" };
    if (code >= 51 && code <= 55) return { label: "Light drizzle", iconType: "drizzle" };
    if (code >= 61 && code <= 65) return { label: "Rain showers", iconType: "rain" };
    if (code >= 71 && code <= 77) return { label: "Snowfall", iconType: "snow" };
    if (code >= 80 && code <= 82) return { label: "Heavy rain", iconType: "rain" };
    if (code >= 95) return { label: "Thunderstorm", iconType: "thunder" };
    return { label: "Moderate conditions", iconType: "cloud" };
}

function formatDate(isoDateStr: string, index: number): { day: string; date: string } {
    const d = new Date(isoDateStr);
    const dayName =
        index === 0
            ? "Today"
            : index === 1
                ? "Tomorrow"
                : d.toLocaleDateString("en-IN", { weekday: "short" });
    const formattedDate = d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
    });
    return { day: dayName, date: formattedDate };
}

export default function ForecastPage() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [current, setCurrent] = useState<CurrentWeatherResponse | null>(null);
    const [forecast, setForecast] = useState<ForecastResponse | null>(null);

    async function handleSearch(locationName: string) {
        const trimmed = locationName.trim();
        if (!trimmed || loading) return;

        setLoading(true);
        setError(null);

        try {
            const [currData, foreData] = await Promise.all([
                getCurrentWeather(trimmed),
                getForecast(trimmed, 5),
            ]);
            setCurrent(currData);
            setForecast(foreData);
        } catch (err) {
            setError(friendlyErrorMessage(err));
            setCurrent(null);
            setForecast(null);
        } finally {
            setLoading(false);
        }
    }

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        handleSearch(query);
    }

    return (
        <div className="mx-auto max-w-5xl px-6 py-10 md:py-16">
            {/* Header */}
            <div className="max-w-2xl">
                <h1 className="font-display text-3xl text-indigo md:text-4xl">
                    Forecast lookup
                </h1>
                <p className="mt-2 font-body text-sm text-ink-soft leading-relaxed">
                    Search any city, town, or district across India for live conditions and a
                    5-day forecast.
                </p>
            </div>

            {/* Search Input Form */}
            <form onSubmit={onSubmit} className="mt-8 max-w-xl">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            id="forecast-location-input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Enter location (e.g. Jaipur, Kochi, Guwahati)…"
                            disabled={loading}
                            className="w-full rounded-lg border border-line bg-surface px-4 py-3 font-body text-sm text-ink placeholder:text-ink-faint outline-none transition-colors hover:border-indigo/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo disabled:opacity-50"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="inline-flex items-center justify-center rounded-lg bg-indigo px-5 py-3 font-body text-sm font-medium text-mist transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Fetching…" : "Search"}
                    </button>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="font-body text-xs text-ink-faint">Try:</span>
                    {EXAMPLE_CITIES.map((city) => (
                        <button
                            key={city}
                            type="button"
                            onClick={() => {
                                setQuery(city);
                                handleSearch(city);
                            }}
                            disabled={loading}
                            className="rounded-full border border-line bg-surface/60 px-3 py-1 font-body text-xs text-ink-soft transition-colors hover:border-indigo hover:text-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo"
                        >
                            {city}
                        </button>
                    ))}
                </div>
            </form>

            {/* Error state */}
            {error && !loading && (
                <div className="mt-8 max-w-xl rounded-xl border border-horizon/30 bg-surface p-5">
                    <p className="font-body text-sm font-medium text-horizon">{error}</p>
                </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
                <div className="mt-12 space-y-6" aria-busy="true" aria-label="Loading forecast data">
                    <div className="h-28 rounded-2xl border border-line bg-surface/40 animate-pulse p-6" />
                    <div className="border-t border-line">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between border-b border-line py-5 animate-pulse"
                            >
                                <div className="h-4 w-32 rounded bg-ink/10" />
                                <div className="h-4 w-20 rounded bg-ink/10" />
                                <div className="h-4 w-28 rounded bg-ink/10" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State before any search */}
            {!loading && !error && !current && (
                <div className="mt-16 rounded-2xl border border-dashed border-line p-10 text-center">
                    <p className="font-display text-xl text-ink">
                        No location selected yet
                    </p>
                    <p className="mt-2 font-body text-sm text-ink-soft">
                        Search above or pick one of the sample towns to view station readings and daily forecasts.
                    </p>
                </div>
            )}

            {/* Results View */}
            {!loading && current && forecast && (
                <div className="mt-12">
                    {/* Current Station Banner */}
                    <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
                        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div>
                                <span className="font-body text-xs uppercase tracking-wider text-paddy">
                                    Live Station Observation
                                </span>
                                <h2 className="mt-1 font-display text-3xl text-indigo md:text-4xl">
                                    {current.location.name}
                                    {current.location.country && (
                                        <span className="ml-2 font-body text-lg font-normal text-ink-soft">
                                            ({current.location.country})
                                        </span>
                                    )}
                                </h2>
                                <p className="mt-1 font-body text-xs text-ink-faint">
                                    Coordinates: {current.location.latitude.toFixed(2)}°N,{" "}
                                    {current.location.longitude.toFixed(2)}°E
                                </p>
                            </div>

                            <div className="flex items-baseline gap-4 border-t border-line pt-4 md:border-t-0 md:pt-0">
                                <p className="font-display text-6xl leading-none text-horizon">
                                    {Math.round(current.current_weather.temperature)}°C
                                </p>
                                <div className="font-body text-xs text-ink-soft space-y-1">
                                    <p className="font-medium text-ink">
                                        {getWeatherDescription(current.current_weather.weathercode).label}
                                    </p>
                                    <p>Wind: {current.current_weather.windspeed_kmh} km/h</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5-Day Forecast Bulletin Rows */}
                    <div className="mt-10">
                        <div className="border-b border-line pb-3">
                            <h3 className="font-display text-xl text-ink">
                                5-day daily forecast
                            </h3>
                            <p className="mt-1 font-body text-xs text-ink-faint">
                                Standard meteorological outlook · temperatures and cumulative rainfall
                            </p>
                        </div>

                        <div className="divide-y divide-line">
                            {forecast.forecast.time.map((timeStr, idx) => {
                                const { day, date } = formatDate(timeStr, idx);
                                const maxTemp = Math.round(forecast.forecast.temperature_2m_max[idx]);
                                const minTemp = Math.round(forecast.forecast.temperature_2m_min[idx]);
                                const precip = forecast.forecast.precipitation_sum[idx];

                                return (
                                    <div
                                        key={timeStr}
                                        className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-indigo/5 px-2 rounded-lg"
                                    >
                                        {/* Day / Date */}
                                        <div className="flex items-center gap-3 min-w-[160px]">
                                            <span className="shrink-0 text-horizon">
                                                <CalendarIcon />
                                            </span>
                                            <div>
                                                <p className="font-display text-lg text-ink leading-tight">
                                                    {day}
                                                </p>
                                                <p className="font-body text-xs text-ink-faint">{date}</p>
                                            </div>
                                        </div>

                                        {/* Temperature High / Low */}
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <span className="font-body text-xs text-ink-faint">High</span>
                                                <span className="font-display text-xl text-horizon font-medium">
                                                    {maxTemp}°C
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-body text-xs text-ink-faint">Low</span>
                                                <span className="font-display text-xl text-indigo font-medium">
                                                    {minTemp}°C
                                                </span>
                                            </div>
                                        </div>

                                        {/* Precipitation */}
                                        <div className="flex items-center gap-2 sm:justify-end min-w-[140px]">
                                            <span className="text-paddy">
                                                <DropletIcon />
                                            </span>
                                            <span className="font-body text-sm text-ink-soft">
                                                {precip > 0 ? `${precip.toFixed(1)} mm rain` : "No rain"}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CalendarIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="1.6" />
            <path stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M16 2v4M8 2v4M3 9.5h18" />
        </svg>
    );
}

function DropletIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2.5s-7 8.5-7 13a7 7 0 0 0 14 0c0-4.5-7-13-7-13Z"
            />
        </svg>
    );
}