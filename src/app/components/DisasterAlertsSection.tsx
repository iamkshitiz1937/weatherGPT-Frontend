"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { getActiveAlerts, type DisasterAlert } from "@/lib/api";

interface DisasterAlertsSectionProps {
    initialLat?: number;
    initialLon?: number;
    initialCity?: string;
}

export function DisasterAlertsSection({
    initialLat = 28.6139,
    initialLon = 77.209,
    initialCity = "Delhi",
}: DisasterAlertsSectionProps) {
    const [lat, setLat] = useState<number>(initialLat);
    const [lon, setLon] = useState<number>(initialLon);
    const [cityName, setCityName] = useState<string>(initialCity);
    const [alerts, setAlerts] = useState<DisasterAlert[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [locating, setLocating] = useState<boolean>(false);
    const [isLiveGeo, setIsLiveGeo] = useState<boolean>(false);

    const hasInitRef = useRef(false);

    const loadAlerts = useCallback(async (targetLat: number, targetLon: number) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getActiveAlerts(targetLat, targetLon, 200);
            setAlerts(data);
        } catch {
            setError("Unable to retrieve live disaster alerts from NDMA SACHET.");
            setAlerts([]);
        } finally {
            setLoading(false);
            setLocating(false);
        }
    }, []);

    // On mount, attempt geolocation exactly once
    useEffect(() => {
        if (hasInitRef.current) return;
        hasInitRef.current = true;

        if (typeof window === "undefined" || !("geolocation" in navigator)) {
            loadAlerts(initialLat, initialLon);
            return;
        }

        setLocating(true);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const userLat = pos.coords.latitude;
                const userLon = pos.coords.longitude;
                setLat(userLat);
                setLon(userLon);
                setIsLiveGeo(true);
                loadAlerts(userLat, userLon);
            },
            () => {
                loadAlerts(initialLat, initialLon);
            },
            { timeout: 7000, maximumAge: 300000 }
        );
    }, [loadAlerts, initialLat, initialLon]);

    function handleRefreshGeo() {
        if (typeof window === "undefined" || !("geolocation" in navigator)) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const userLat = pos.coords.latitude;
                const userLon = pos.coords.longitude;
                setLat(userLat);
                setLon(userLon);
                setIsLiveGeo(true);
                loadAlerts(userLat, userLon);
            },
            () => {
                loadAlerts(lat, lon);
            },
            { timeout: 9000, enableHighAccuracy: true }
        );
    }

    return (
        <section className="mt-14 border-t border-line pt-10" aria-label="Disaster Alerts">
            {/* Section Header with 200km badge & radius context */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-horizon/30 bg-horizon/10 px-2.5 py-0.5 font-body text-xs font-semibold text-horizon">
                            <span className="h-1.5 w-1.5 rounded-full bg-horizon animate-ping" />
                            200 km Disaster Radius
                        </span>
                        <span className="font-body text-xs text-ink-faint">
                            SACHET · NDMA Protocol
                        </span>
                    </div>

                    <h2 className="mt-2 font-display text-2xl text-ink md:text-3xl">
                        Prominent disaster alerts near you
                    </h2>
                    <p className="mt-1 max-w-2xl font-body text-xs text-ink-soft">
                        Live emergency bulletins within a 200 km radius of{" "}
                        <span className="font-medium text-ink">
                            {isLiveGeo ? "your detected location" : cityName}
                        </span>{" "}
                        ({lat.toFixed(2)}°N, {lon.toFixed(2)}°E).
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleRefreshGeo}
                        disabled={locating || loading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 font-body text-xs text-ink-soft transition-colors hover:border-indigo hover:text-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo disabled:opacity-50"
                    >
                        <LocationPinIcon />
                        {locating ? "Detecting…" : "Update location"}
                    </button>

                    <Link
                        href="/alerts"
                        className="inline-flex items-center gap-1 font-body text-xs font-medium text-indigo hover:underline"
                    >
                        All India alerts ({alerts.length > 0 ? `${alerts.length} nearby` : "Browse all"}) →
                    </Link>
                </div>
            </div>

            {/* Loading Skeleton */}
            {loading && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Loading disaster alerts">
                    {[1, 2].map((i) => (
                        <div key={i} className="h-40 rounded-2xl border border-line bg-surface/50 p-5 animate-pulse space-y-3">
                            <div className="h-4 w-28 rounded bg-ink/10" />
                            <div className="h-5 w-3/4 rounded bg-ink/10" />
                            <div className="h-10 w-full rounded bg-ink/10" />
                        </div>
                    ))}
                </div>
            )}

            {/* Error state */}
            {error && !loading && (
                <div className="mt-6 rounded-xl border border-horizon/30 bg-surface p-4 text-xs font-body text-horizon">
                    {error}
                </div>
            )}

            {/* When ALERTS ARE PRESENT within 200 km */}
            {!loading && !error && alerts.length > 0 && (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {alerts.map((alert) => {
                        const isRed =
                            alert.severity_color?.toLowerCase() === "red" ||
                            alert.severity?.toUpperCase() === "SEVERE" ||
                            alert.severity?.toUpperCase() === "EXTREME";
                        const isOrange =
                            alert.severity_color?.toLowerCase() === "orange" ||
                            alert.severity?.toUpperCase() === "ALERT";

                        const borderClass = isRed
                            ? "border-red-500/40 hover:border-red-500"
                            : isOrange
                                ? "border-horizon/50 hover:border-horizon"
                                : "border-amber-500/40 hover:border-amber-500";

                        const badgeBg = isRed
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                            : isOrange
                                ? "bg-horizon/10 text-horizon border-horizon/30"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";

                        return (
                            <div
                                key={alert.identifier}
                                className={`flex flex-col justify-between rounded-2xl border bg-surface p-5 shadow-xs transition-all ${borderClass}`}
                            >
                                <div>
                                    {/* Card top bar: Event type + Severity badge + Distance */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-2 w-2 rounded-full bg-horizon" />
                                            <span className="font-display text-sm font-semibold text-ink">
                                                {alert.event || "Emergency Warning"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-body text-[0.68rem] font-medium uppercase tracking-wider ${badgeBg}`}>
                                                {alert.severity || "ALERT"} {alert.severity_level ? `· ${alert.severity_level}` : ""}
                                            </span>

                                            {alert.distance_km !== undefined && alert.distance_km !== null && (
                                                <span className="font-body text-xs font-semibold text-indigo">
                                                    {alert.distance_km} km away
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Headline & Area Details */}
                                    <div className="mt-3.5 space-y-2">
                                        <h3 className="font-display text-base leading-snug text-ink line-clamp-2">
                                            {alert.headline || "Disaster alert issued for immediate jurisdiction."}
                                        </h3>

                                        {alert.area_description && (
                                            <p className="font-body text-xs text-ink-soft line-clamp-2">
                                                <span className="font-medium text-ink">Affected Areas:</span>{" "}
                                                {alert.area_description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Card footer: Authority source + CTA */}
                                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                                    <span className="font-body text-[0.68rem] text-ink-faint">
                                        Source: {alert.source || "NDMA / IMD"}
                                    </span>

                                    <Link
                                        href={`/alerts#${encodeURIComponent(alert.identifier)}`}
                                        className="inline-flex items-center gap-1 rounded-md bg-indigo px-3 py-1 font-body text-xs font-medium text-mist transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                                    >
                                        View Details
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* When NO ALERTS ARE PRESENT within 200 km (Clean Reassurance State) */}
            {!loading && !error && alerts.length === 0 && (
                <div className="mt-6 rounded-2xl border border-paddy/30 bg-surface p-6 sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-paddy/10 text-paddy">
                                <ShieldCheckIcon />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-paddy/15 px-2.5 py-0.5 font-body text-[0.68rem] font-semibold text-paddy uppercase tracking-wider">
                                        All Clear · 200 km Radius
                                    </span>
                                    <span className="font-body text-xs text-ink-faint">
                                        Updated just now
                                    </span>
                                </div>
                                <h3 className="mt-1.5 font-display text-lg text-ink">
                                    No active disaster alerts within 200 km of your location
                                </h3>
                                <p className="mt-1 max-w-xl font-body text-xs text-ink-soft leading-relaxed">
                                    National Disaster Management Authority (SACHET) and India Meteorological Department
                                    report no severe flood, storm, cyclonic disturbance, or heavy rainfall warnings in your immediate 200 km zone.
                                </p>
                            </div>
                        </div>

                        <Link
                            href="/alerts"
                            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-line bg-mist/40 px-4 py-2 font-body text-xs font-medium text-ink transition-colors hover:border-indigo hover:text-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                        >
                            Browse All-India Alerts →
                        </Link>
                    </div>
                </div>
            )}
        </section>
    );
}

function ShieldCheckIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
            />
            <path
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m9 12 2 2 4-4"
            />
        </svg>
    );
}

function LocationPinIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z"
            />
            <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    );
}
