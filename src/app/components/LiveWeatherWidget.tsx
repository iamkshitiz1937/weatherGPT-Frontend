"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
    getCurrentWeather,
    getCurrentWeatherByCoords,
    type CurrentWeatherResponse,
} from "@/lib/api";

export function getWeatherConditionMeta(code?: number, isDay = 1): {
    label: string;
    sub: string;
    icon: string;
} {
    if (code === undefined || code === null) {
        return { label: "Condition unavailable", sub: "Weather code not reported", icon: "cloud" };
    }
    if (code === 0) {
        return { label: isDay ? "Clear sky" : "Clear night", sub: "Optimal visibility", icon: isDay ? "sun" : "moon" };
    }
    if (code === 1) {
        return { label: isDay ? "Mainly clear" : "Mainly clear night", sub: "Scattered thin clouds", icon: isDay ? "sun-cloud" : "moon-cloud" };
    }
    if (code === 2) {
        return { label: "Partly cloudy", sub: "Periodic cloud cover", icon: "cloud-sun" };
    }
    if (code === 3) {
        return { label: "Overcast", sub: "Complete cloud cover", icon: "cloud" };
    }
    if (code >= 45 && code <= 48) {
        return { label: "Fog / Mist", sub: "Reduced surface visibility", icon: "fog" };
    }
    if (code >= 51 && code <= 55) {
        return { label: "Light drizzle", sub: "Low intensity precipitation", icon: "drizzle" };
    }
    if (code >= 61 && code <= 65) {
        return { label: "Rain showers", sub: "Active precipitation", icon: "rain" };
    }
    if (code >= 71 && code <= 77) {
        return { label: "Snowfall", sub: "Sub-zero precipitation", icon: "snow" };
    }
    if (code >= 80 && code <= 82) {
        return { label: "Heavy rain", sub: "Intense precipitation", icon: "heavy-rain" };
    }
    if (code >= 95) {
        return { label: "Thunderstorm", sub: "Convective electrical storm", icon: "thunder" };
    }
    return { label: "Moderate conditions", sub: "Seasonal conditions", icon: "cloud" };
}

interface LiveWeatherWidgetProps {
    onLocationChange?: (lat: number, lon: number, name: string) => void;
}

export function LiveWeatherWidget({ onLocationChange }: LiveWeatherWidgetProps) {
    const [data, setData] = useState<CurrentWeatherResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [locating, setLocating] = useState(true);
    const [locMode, setLocMode] = useState<"geo" | "manual" | "default">("geo");
    const [isEditing, setIsEditing] = useState(false);
    const [cityQuery, setCityQuery] = useState("");
    const [geoError, setGeoError] = useState<string | null>(null);

    const hasInitRef = useRef(false);

    const fetchByCoords = useCallback(
        async (lat: number, lon: number) => {
            setLoading(true);
            setGeoError(null);
            try {
                const res = await getCurrentWeatherByCoords(lat, lon);
                setData(res);
                setLocMode("geo");
                if (onLocationChange) {
                    onLocationChange(lat, lon, res.location.name);
                }
            } catch {
                setGeoError("Could not load weather for detected coordinates.");
            } finally {
                setLoading(false);
                setLocating(false);
            }
        },
        [onLocationChange]
    );

    const fetchByCity = useCallback(
        async (cityName: string) => {
            const trimmed = cityName.trim();
            if (!trimmed) return;
            setLoading(true);
            setGeoError(null);
            try {
                const res = await getCurrentWeather(trimmed);
                setData(res);
                setLocMode(trimmed.toLowerCase() === "delhi" ? "default" : "manual");
                setIsEditing(false);
                setCityQuery("");
                if (onLocationChange) {
                    onLocationChange(res.location.latitude, res.location.longitude, res.location.name);
                }
            } catch {
                setGeoError(`Location '${trimmed}' not found. Try another city.`);
            } finally {
                setLoading(false);
                setLocating(false);
            }
        },
        [onLocationChange]
    );

    // Auto-detect location exactly once on initial mount
    useEffect(() => {
        if (hasInitRef.current) return;
        hasInitRef.current = true;

        if (typeof window === "undefined" || !("geolocation" in navigator)) {
            setLocating(false);
            fetchByCity("Delhi");
            return;
        }

        setLocating(true);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                fetchByCoords(pos.coords.latitude, pos.coords.longitude);
            },
            () => {
                // Fall back to Delhi if user denies geolocation or error occurs
                fetchByCity("Delhi");
            },
            { timeout: 7000, maximumAge: 300000 }
        );
    }, [fetchByCoords, fetchByCity]);

    function handleDetectClick() {
        if (typeof window === "undefined" || !("geolocation" in navigator)) {
            setGeoError("Geolocation is not supported by your browser.");
            return;
        }
        setLocating(true);
        setGeoError(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                fetchByCoords(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                setLocating(false);
                if (err.code === 1) {
                    setGeoError("Location permission denied. Please allow location access or type your city.");
                } else {
                    setGeoError("Could not retrieve precise location. Please type your city.");
                }
            },
            { timeout: 9000, enableHighAccuracy: true }
        );
    }

    const cw = data?.current_weather;
    const cond = cw ? getWeatherConditionMeta(cw.weathercode, cw.is_day) : null;

    return (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs transition-all hover:border-indigo/30">
            {/* Header bar: Live status + location badge + switcher */}
            <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className={`absolute inline-flex h-full w-full rounded-full ${loading ? "bg-horizon animate-ping" : "bg-paddy animate-ping"} opacity-75`} />
                        <span className={`relative inline-flex h-2 w-2 rounded-full ${loading ? "bg-horizon" : "bg-paddy"}`} />
                    </span>
                    <span className="font-body text-xs uppercase tracking-wider text-ink-faint">
                        {loading ? "Locating your station…" : locMode === "geo" ? "Your Live Station" : "Station Readout"}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleDetectClick}
                        disabled={locating || loading}
                        title="Auto-detect my location"
                        className="inline-flex items-center gap-1 rounded-full border border-line bg-mist/60 px-2.5 py-1 font-body text-[0.68rem] text-ink-soft transition-colors hover:border-indigo hover:text-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo disabled:opacity-50"
                    >
                        <CompassIcon />
                        <span>{locating ? "Locating…" : "My Location"}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsEditing((prev) => !prev)}
                        className="rounded-full border border-line bg-mist/60 px-2.5 py-1 font-body text-[0.68rem] text-ink-soft transition-colors hover:border-indigo hover:text-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                    >
                        {isEditing ? "Close" : "Change city"}
                    </button>
                </div>
            </div>

            {/* City search bar dropdown */}
            {isEditing && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        fetchByCity(cityQuery);
                    }}
                    className="mt-3 flex items-center gap-2"
                >
                    <input
                        type="text"
                        value={cityQuery}
                        onChange={(e) => setCityQuery(e.target.value)}
                        placeholder="Type city or district (e.g. Mumbai, Kochi)…"
                        autoFocus
                        className="flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 font-body text-xs text-ink outline-none transition-colors hover:border-indigo/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                    />
                    <button
                        type="submit"
                        disabled={!cityQuery.trim() || loading}
                        className="rounded-lg bg-indigo px-3.5 py-1.5 font-body text-xs font-medium text-mist transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        Update
                    </button>
                </form>
            )}

            {/* Geolocation error message */}
            {geoError && (
                <div className="mt-3 rounded-lg border border-horizon/30 bg-surface p-2.5 font-body text-xs text-horizon">
                    {geoError}
                </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
                <div className="mt-4 space-y-4" aria-busy="true" aria-label="Loading your weather station">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <div className="h-10 w-28 rounded-lg bg-ink/10 animate-pulse" />
                            <div className="h-4 w-44 rounded bg-ink/10 animate-pulse" />
                        </div>
                        <div className="h-8 w-28 rounded-full bg-ink/10 animate-pulse" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-line pt-4">
                        <div className="h-14 rounded-xl bg-ink/5 animate-pulse" />
                        <div className="h-14 rounded-xl bg-ink/5 animate-pulse" />
                        <div className="h-14 rounded-xl bg-ink/5 animate-pulse" />
                    </div>
                </div>
            )}

            {/* Live Data Display */}
            {!loading && data && cw && (
                <div className="mt-4">
                    {/* Main Temp + Condition badge */}
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-baseline gap-2">
                                <p className="font-display text-5xl leading-none text-horizon">
                                    {Math.round(cw.temperature)}°C
                                </p>
                                {cw.apparent_temperature !== undefined && (
                                    <span className="font-body text-xs text-ink-soft">
                                        Feels {Math.round(cw.apparent_temperature)}°C
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 font-display text-base text-ink">
                                {data.location.name}
                            </p>
                        </div>

                        {/* Condition Icon & Description */}
                        <div className="flex flex-col items-end text-right">
                            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-mist/50 px-2.5 py-1 font-body text-xs font-medium text-indigo">
                                <ConditionIcon type={cond?.icon ?? "sun"} />
                                {cond?.label}
                            </span>
                            <span className="mt-1 font-body text-[0.68rem] text-ink-faint">
                                {cond?.sub}
                            </span>
                        </div>
                    </div>

                    {/* Micro-metrics Grid */}
                    <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
                        {/* Wind */}
                        <div className="rounded-xl border border-line/60 bg-mist/30 p-2.5">
                            <div className="flex items-center gap-1 text-ink-faint">
                                <WindIcon />
                                <span className="font-body text-[0.68rem] uppercase tracking-wider">Wind</span>
                            </div>
                            <p className="mt-1 font-display text-sm text-ink">
                                {cw.windspeed_kmh} <span className="font-body text-xs font-normal text-ink-soft">km/h</span>
                            </p>
                        </div>

                        {/* Humidity */}
                        <div className="rounded-xl border border-line/60 bg-mist/30 p-2.5">
                            <div className="flex items-center gap-1 text-ink-faint">
                                <HumidityIcon />
                                <span className="font-body text-[0.68rem] uppercase tracking-wider">Humidity</span>
                            </div>
                            <p className="mt-1 font-display text-sm text-ink">
                                {cw.humidity !== undefined && cw.humidity !== null ? `${cw.humidity}%` : "—"}
                            </p>
                        </div>

                        {/* Pressure */}
                        <div className="rounded-xl border border-line/60 bg-mist/30 p-2.5">
                            <div className="flex items-center gap-1 text-ink-faint">
                                <BarometerIcon />
                                <span className="font-body text-[0.68rem] uppercase tracking-wider">Pressure</span>
                            </div>
                            <p className="mt-1 font-display text-sm text-ink">
                                {cw.surface_pressure ? Math.round(cw.surface_pressure) : "—"}{" "}
                                <span className="font-body text-[0.68rem] font-normal text-ink-soft">hPa</span>
                            </p>
                        </div>
                    </div>

                    {/* Precipitation Alert Sub-strip if raining */}
                    {cw.precipitation !== undefined && cw.precipitation > 0 && (
                        <div className="mt-3 flex items-center justify-between rounded-lg border border-paddy/30 bg-paddy/10 px-3 py-1.5">
                            <span className="flex items-center gap-1.5 font-body text-xs text-paddy">
                                <DropletIcon />
                                Active Rainfall
                            </span>
                            <span className="font-display text-xs text-paddy font-medium">
                                {cw.precipitation.toFixed(1)} mm/hr
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Offline / Backend Fallback */}
            {!loading && !data && (
                <div className="mt-4">
                    <p className="font-body text-sm text-ink-faint">
                        Start the backend locally to view live readings for your location.
                    </p>
                </div>
            )}
        </div>
    );
}

function CompassIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.8" />
        </svg>
    );
}

function WindIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
        </svg>
    );
}

function HumidityIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
    );
}

function BarometerIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="m12 12 3-3" />
        </svg>
    );
}

function DropletIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 2.5s-7 8.5-7 13a7 7 0 0 0 14 0c0-4.5-7-13-7-13Z" />
        </svg>
    );
}

function ConditionIcon({ type }: { type: string }) {
    if (type === "sun") {
        return (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
                <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
        );
    }
    if (type === "moon") {
        return (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
        );
    }
    if (type === "rain" || type === "heavy-rain" || type === "drizzle") {
        return (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M7 16a4 4 0 0 1-.5-7.97A5 5 0 0 1 16.9 7.1 3.75 3.75 0 0 1 16.5 16h-9Z" />
                <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="m8 19-1 2m6-2-1 2m6-2-1 2" />
            </svg>
        );
    }
    if (type === "thunder") {
        return (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M7 14a4 4 0 0 1-.5-7.97A5 5 0 0 1 16.9 5.1 3.75 3.75 0 0 1 16.5 14h-9Z" />
                <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="m13 14-3 5h4l-2 4" />
            </svg>
        );
    }
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M7.5 17a4 4 0 0 1-.5-7.97A5 5 0 0 1 16.9 8.1 3.75 3.75 0 0 1 16.5 17h-9Z" />
        </svg>
    );
}