"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    getActiveAlerts,
    getAlertDetail,
    type DisasterAlert,
    type DisasterAlertDetail,
} from "@/lib/api";
import { useMounted } from "@/lib/useMounted";

type RadiusOption = "200" | "500" | "all";
type SeverityFilter = "all" | "red" | "orange" | "yellow";

export default function DisasterAlertsPage() {
    const mounted = useMounted();
    const [allAlerts, setAllAlerts] = useState<DisasterAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // User location state
    const [userLat, setUserLat] = useState<number | null>(null);
    const [userLon, setUserLon] = useState<number | null>(null);
    const [locating, setLocating] = useState(false);
    const [locationName, setLocationName] = useState<string>("Locating…");

    // Filters
    const [radius, setRadius] = useState<RadiusOption>("all");
    const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
    const [selectedEvent, setSelectedEvent] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Modal / Detail state
    const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
    const [alertDetail, setAlertDetail] = useState<DisasterAlertDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    // Fetch alerts from backend
    const fetchAlerts = useCallback(
        async (lat?: number | null, lon?: number | null, rOption?: RadiusOption) => {
            setLoading(true);
            setError(null);
            try {
                const radiusKm =
                    rOption === "200" ? 200 : rOption === "500" ? 500 : undefined;
                const data = await getActiveAlerts(
                    lat ?? undefined,
                    lon ?? undefined,
                    radiusKm
                );
                setAllAlerts(data);
            } catch {
                setError("Unable to connect to SACHET / NDMA alert feed. Please check backend connection.");
                setAllAlerts([]);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    // Geolocation detection
    useEffect(() => {
        if (typeof window === "undefined" || !("geolocation" in navigator)) {
            fetchAlerts(null, null, "all");
            setLocationName("Default (All India)");
            return;
        }

        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                setUserLat(lat);
                setUserLon(lon);
                setLocationName(`Your Location (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`);
                setLocating(false);
                fetchAlerts(lat, lon, radius);
            },
            () => {
                setLocating(false);
                setLocationName("Location access disabled (All India)");
                fetchAlerts(null, null, "all");
            },
            { timeout: 7000, maximumAge: 300000 }
        );
    }, [fetchAlerts, radius]);

    // Open detail modal when selected
    async function handleOpenDetail(alert: DisasterAlert) {
        setSelectedAlertId(alert.identifier);
        setAlertDetail(alert as DisasterAlertDetail);
        setDetailLoading(true);
        setDetailError(null);
        try {
            const full = await getAlertDetail(alert.identifier);
            if (full) {
                setAlertDetail((prev) => ({ ...prev, ...full } as DisasterAlertDetail));
            }
        } catch {
            setDetailError(
                "Could not load the full CAP advisory from the server. Showing basic bulletin only — instructions and area details below may be incomplete."
            );
        } finally {
            setDetailLoading(false);
        }
    }

    function handleCloseDetail() {
        setSelectedAlertId(null);
        setAlertDetail(null);
        setDetailError(null);
    }

    // Handle URL hash on initial load (e.g. /alerts#1788272895965009)
    useEffect(() => {
        if (!allAlerts.length || typeof window === "undefined") return;
        const hash = window.location.hash.replace("#", "");
        if (hash) {
            const target = allAlerts.find((a) => a.identifier === hash);
            if (target) {
                handleOpenDetail(target);
            }
        }
    }, [allAlerts]);

    // Unique event types for filter tabs
    const availableEvents = useMemo(() => {
        const set = new Set<string>();
        allAlerts.forEach((a) => {
            if (a.event) set.add(a.event);
        });
        return Array.from(set);
    }, [allAlerts]);

    // Filtered alerts
    const filteredAlerts = useMemo(() => {
        return allAlerts.filter((a) => {
            // Radius filter when userLat/userLon are present
            if (radius === "200" && a.distance_km !== undefined && a.distance_km !== null) {
                if (a.distance_km > 200) return false;
            }
            if (radius === "500" && a.distance_km !== undefined && a.distance_km !== null) {
                if (a.distance_km > 500) return false;
            }

            // Severity filter
            if (severityFilter === "red") {
                const isRed =
                    a.severity_color?.toLowerCase() === "red" ||
                    a.severity?.toUpperCase() === "SEVERE" ||
                    a.severity?.toUpperCase() === "EXTREME";
                if (!isRed) return false;
            } else if (severityFilter === "orange") {
                const isOrange =
                    a.severity_color?.toLowerCase() === "orange" ||
                    a.severity?.toUpperCase() === "ALERT";
                if (!isOrange) return false;
            } else if (severityFilter === "yellow") {
                const isYellow =
                    a.severity_color?.toLowerCase() === "yellow" ||
                    a.severity?.toUpperCase() === "WARNING" ||
                    a.severity?.toUpperCase() === "WATCH";
                if (!isYellow) return false;
            }

            // Event type filter
            if (selectedEvent !== "all" && a.event !== selectedEvent) {
                return false;
            }

            // Keyword search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const inHead = a.headline?.toLowerCase().includes(q) ?? false;
                const inArea = a.area_description?.toLowerCase().includes(q) ?? false;
                const inEvent = a.event?.toLowerCase().includes(q) ?? false;
                const inSource = a.source?.toLowerCase().includes(q) ?? false;
                if (!inHead && !inArea && !inEvent && !inSource) return false;
            }

            return true;
        });
    }, [allAlerts, radius, severityFilter, selectedEvent, searchQuery]);

    // Aggregate stats
    const stats = useMemo(() => {
        const total = allAlerts.length;
        const nearby200 = allAlerts.filter(
            (a) => a.distance_km !== undefined && a.distance_km !== null && a.distance_km <= 200
        ).length;
        const severeCount = allAlerts.filter(
            (a) =>
                a.severity_color?.toLowerCase() === "red" ||
                a.severity?.toUpperCase() === "SEVERE" ||
                a.severity?.toUpperCase() === "EXTREME"
        ).length;

        return { total, nearby200, severeCount };
    }, [allAlerts]);

    return (
        <div className="mx-auto max-w-5xl px-6 py-10 md:py-16">
            {/* Header */}
            <div className="max-w-3xl">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-horizon/30 bg-horizon/10 px-3 py-1 font-body text-xs font-semibold text-horizon">
                        <span className="h-2 w-2 rounded-full bg-horizon animate-ping" />
                        Live Emergency Feed
                    </span>
                    <span className="font-body text-xs text-ink-faint">
                        SACHET · National Disaster Management Authority
                    </span>
                </div>

                <h1 className="mt-3 font-display text-3xl text-indigo md:text-5xl">
                    Disaster alerts & warnings
                </h1>
                <p className="mt-2 font-body text-sm text-ink-soft leading-relaxed">
                    Real-time disaster advisories, flood warnings, severe convective storms, and cyclonic alerts
                    governed by India&apos;s Common Alerting Protocol (CAP) system.
                </p>
            </div>

            {/* Summary KPI Strip */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {/* Total Active Alerts */}
                <div className="rounded-xl border border-line bg-surface p-4">
                    <p className="font-body text-xs text-ink-faint">Total Active Alerts</p>
                    <p className="mt-1 font-display text-3xl text-ink font-semibold">
                        {stats.total}
                    </p>
                    <p className="mt-0.5 font-body text-[0.68rem] text-ink-faint">Across all India</p>
                </div>

                {/* Nearby Alerts within 200km */}
                <div className="rounded-xl border border-line bg-surface p-4">
                    <p className="font-body text-xs text-ink-faint">Within 200 km of You</p>
                    <p className={`mt-1 font-display text-3xl font-semibold ${stats.nearby200 > 0 ? "text-horizon" : "text-paddy"}`}>
                        {stats.nearby200}
                    </p>
                    <p className="mt-0.5 font-body text-[0.68rem] text-ink-faint">
                        {stats.nearby200 > 0 ? "Immediate caution recommended" : "All clear in your zone"}
                    </p>
                </div>

                {/* Severe / Red Alerts */}
                <div className="rounded-xl border border-line bg-surface p-4">
                    <p className="font-body text-xs text-ink-faint">Severe / Red Alerts</p>
                    <p className="mt-1 font-display text-3xl text-red-600 dark:text-red-400 font-semibold">
                        {stats.severeCount}
                    </p>
                    <p className="mt-0.5 font-body text-[0.68rem] text-ink-faint">High urgency status</p>
                </div>

                {/* Monitored Agency */}
                <div className="hidden rounded-xl border border-line bg-surface p-4 md:block">
                    <p className="font-body text-xs text-ink-faint">Data Sources</p>
                    <p className="mt-1 font-display text-lg text-indigo">
                        NDMA · IMD · SDMA
                    </p>
                    <p className="mt-0.5 font-body text-[0.68rem] text-paddy">CAP 1.2 Compliant</p>
                </div>
            </div>

            {/* Filter & Control Bar */}
            <div className="mt-8 rounded-2xl border border-line bg-surface p-5 space-y-4">
                {/* Top filter row: Distance radius toggle & Search */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    {/* Radius selector */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-body text-xs font-medium uppercase tracking-wider text-ink-faint mr-1">
                            Scope:
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setRadius("all");
                                if (userLat && userLon) fetchAlerts(userLat, userLon, "all");
                            }}
                            className={`rounded-full px-3.5 py-1.5 font-body text-xs transition-colors ${radius === "all"
                                    ? "bg-indigo text-mist font-medium"
                                    : "border border-line bg-surface text-ink-soft hover:border-indigo/40"
                                }`}
                        >
                            All India ({allAlerts.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setRadius("200");
                                if (userLat && userLon) fetchAlerts(userLat, userLon, "200");
                            }}
                            className={`rounded-full px-3.5 py-1.5 font-body text-xs transition-colors ${radius === "200"
                                    ? "bg-indigo text-mist font-medium"
                                    : "border border-line bg-surface text-ink-soft hover:border-indigo/40"
                                }`}
                        >
                            Within 200 km
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setRadius("500");
                                if (userLat && userLon) fetchAlerts(userLat, userLon, "500");
                            }}
                            className={`rounded-full px-3.5 py-1.5 font-body text-xs transition-colors ${radius === "500"
                                    ? "bg-indigo text-mist font-medium"
                                    : "border border-line bg-surface text-ink-soft hover:border-indigo/40"
                                }`}
                        >
                            Within 500 km
                        </button>
                    </div>

                    {/* Search box */}
                    <div className="relative min-w-[240px]">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by district, state or keyword…"
                            className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 font-body text-xs text-ink outline-none transition-colors hover:border-indigo/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-2 font-body text-xs text-ink-faint hover:text-ink"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Second filter row: Severity & Event types */}
                <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
                    {/* Severity filter tabs */}
                    <div className="flex items-center gap-1.5">
                        <span className="font-body text-xs font-medium uppercase tracking-wider text-ink-faint mr-1">
                            Severity:
                        </span>
                        <button
                            type="button"
                            onClick={() => setSeverityFilter("all")}
                            className={`rounded-md px-2.5 py-1 font-body text-xs ${severityFilter === "all"
                                    ? "bg-indigo text-mist font-medium"
                                    : "border border-line text-ink-soft hover:border-indigo/40"
                                }`}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            onClick={() => setSeverityFilter("red")}
                            className={`rounded-md px-2.5 py-1 font-body text-xs ${severityFilter === "red"
                                    ? "bg-red-600 text-mist font-medium"
                                    : "border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                }`}
                        >
                            Red / Severe
                        </button>
                        <button
                            type="button"
                            onClick={() => setSeverityFilter("orange")}
                            className={`rounded-md px-2.5 py-1 font-body text-xs ${severityFilter === "orange"
                                    ? "bg-horizon text-mist font-medium"
                                    : "border border-horizon/30 text-horizon hover:bg-horizon/10"
                                }`}
                        >
                            Orange / Alert
                        </button>
                        <button
                            type="button"
                            onClick={() => setSeverityFilter("yellow")}
                            className={`rounded-md px-2.5 py-1 font-body text-xs ${severityFilter === "yellow"
                                    ? "bg-amber-600 text-mist font-medium"
                                    : "border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                                }`}
                        >
                            Yellow / Watch
                        </button>
                    </div>

                    {/* Event type pills */}
                    {availableEvents.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pl-2">
                            <span className="font-body text-xs font-medium uppercase tracking-wider text-ink-faint mr-1">
                                Event:
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedEvent("all")}
                                className={`rounded-md px-2.5 py-1 font-body text-xs ${selectedEvent === "all"
                                        ? "bg-ink text-mist font-medium"
                                        : "border border-line text-ink-soft hover:border-indigo/40"
                                    }`}
                            >
                                All Events
                            </button>
                            {availableEvents.slice(0, 5).map((ev) => (
                                <button
                                    key={ev}
                                    type="button"
                                    onClick={() => setSelectedEvent(ev)}
                                    className={`rounded-md px-2.5 py-1 font-body text-xs ${selectedEvent === ev
                                            ? "bg-ink text-mist font-medium"
                                            : "border border-line text-ink-soft hover:border-indigo/40"
                                        }`}
                                >
                                    {ev}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Error state */}
            {error && !loading && (
                <div className="mt-8 rounded-xl border border-horizon/30 bg-surface p-5 text-sm font-body text-horizon">
                    {error}
                </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
                <div className="mt-8 space-y-4" aria-busy="true" aria-label="Loading active alerts">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 rounded-2xl border border-line bg-surface/50 p-5 animate-pulse space-y-3">
                            <div className="h-4 w-36 rounded bg-ink/10" />
                            <div className="h-5 w-2/3 rounded bg-ink/10" />
                            <div className="h-4 w-1/2 rounded bg-ink/10" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredAlerts.length === 0 && (
                <div className="mt-12 rounded-2xl border border-dashed border-line p-10 text-center">
                    <p className="font-display text-xl text-ink">
                        No disaster alerts match the current filter
                    </p>
                    <p className="mt-2 font-body text-sm text-ink-soft">
                        {radius === "200"
                            ? "No active alerts within 200 km of your location. Try switching to 'All India' scope above."
                            : "Try adjusting your search keywords or severity filters."}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setRadius("all");
                            setSeverityFilter("all");
                            setSelectedEvent("all");
                            setSearchQuery("");
                        }}
                        className="mt-4 inline-flex items-center rounded-lg bg-indigo px-4 py-2 font-body text-xs font-medium text-mist hover:opacity-90"
                    >
                        Reset all filters
                    </button>
                </div>
            )}

            {/* Active Alerts List */}
            {!loading && !error && filteredAlerts.length > 0 && (
                <div className="mt-8 space-y-4">
                    <p className="font-body text-xs text-ink-faint">
                        Showing {filteredAlerts.length} of {allAlerts.length} active emergency bulletins
                    </p>

                    <div className="grid gap-4">
                        {filteredAlerts.map((alert) => {
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
                                    id={alert.identifier}
                                    className={`flex flex-col justify-between rounded-2xl border bg-surface p-5 shadow-xs transition-all ${borderClass}`}
                                >
                                    <div>
                                        {/* Top strip: Event, Severity badge, Distance, Time */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-2.5 w-2.5 rounded-full bg-horizon" />
                                                <span className="font-display text-base font-semibold text-ink">
                                                    {alert.event || "Disaster Advisory"}
                                                </span>
                                                {alert.language && (
                                                    <span className="rounded bg-mist px-1.5 py-0.5 font-mono text-[0.62rem] uppercase text-ink-faint">
                                                        {alert.language}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-body text-[0.68rem] font-medium uppercase tracking-wider ${badgeBg}`}>
                                                    {alert.severity || "ALERT"} {alert.severity_level ? `· ${alert.severity_level}` : ""}
                                                </span>

                                                {alert.distance_km !== undefined && alert.distance_km !== null && (
                                                    <span className="font-body text-xs font-semibold text-indigo">
                                                        {alert.distance_km} km away
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Headline and Area */}
                                        <div className="mt-3.5 space-y-2">
                                            <h2 className="font-display text-lg leading-snug text-ink">
                                                {alert.headline || "Active disaster bulletin issued."}
                                            </h2>

                                            {alert.area_description && (
                                                <p className="font-body text-xs text-ink-soft">
                                                    <span className="font-medium text-ink">Affected Jurisdictions:</span>{" "}
                                                    {alert.area_description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer: Source + Validity + Detail Button */}
                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                                        <div className="flex items-center gap-4 text-[0.68rem] font-body text-ink-faint">
                                            <span>Issuing Authority: <strong className="font-medium text-ink-soft">{alert.source || "NDMA / IMD"}</strong></span>
                                            {alert.effective_end && (
                                                <span>
                                                    Valid until: {new Date(alert.effective_end).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenDetail(alert)}
                                            className="inline-flex items-center gap-1 rounded-md bg-indigo px-3.5 py-1.5 font-body text-xs font-medium text-mist transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                                        >
                                            View CAP Detail Advisory →
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* CAP Alert Detail Modal / Drawer */}
            {selectedAlertId && alertDetail && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs p-4 sm:p-6"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="alert-modal-title"
                >
                    <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl sm:p-8">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between border-b border-line pb-4">
                            <div>
                                <span className="font-body text-xs uppercase tracking-wider text-horizon font-medium">
                                    CAP 1.2 Standard Disaster Advisory
                                </span>
                                <h3 id="alert-modal-title" className="mt-1 font-display text-2xl text-ink">
                                    {alertDetail.event || "Disaster Advisory"}
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={handleCloseDetail}
                                className="rounded-full border border-line p-1.5 text-ink-soft hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                                aria-label="Close modal"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Detail fetch error banner */}
                        {detailError && !detailLoading && (
                            <div
                                role="alert"
                                className="mt-4 flex items-start gap-2 rounded-xl border border-horizon/40 bg-horizon/10 p-3.5"
                            >
                                <span className="mt-0.5 text-horizon">⚠</span>
                                <p className="font-body text-xs leading-relaxed text-horizon">
                                    {detailError}
                                </p>
                            </div>
                        )}

                        {detailLoading && (
                            <div className="mt-4 rounded-xl border border-line bg-mist/30 p-3.5">
                                <p className="font-body text-xs text-ink-faint">
                                    Fetching full CAP advisory details…
                                </p>
                            </div>
                        )}

                        {/* Modal Body */}
                        <div className="mt-5 space-y-4 font-body text-xs leading-relaxed text-ink-soft">
                            {/* Severity / Urgency / Certainty Strip */}
                            <div className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-mist/30 p-3">
                                <div>
                                    <span className="text-[0.68rem] text-ink-faint block uppercase">Severity</span>
                                    <span className="font-display text-sm font-semibold text-horizon">
                                        {alertDetail.severity || "Alert"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[0.68rem] text-ink-faint block uppercase">Urgency</span>
                                    <span className="font-display text-sm font-semibold text-ink">
                                        {alertDetail.urgency || "Immediate"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[0.68rem] text-ink-faint block uppercase">Certainty</span>
                                    <span className="font-display text-sm font-semibold text-paddy">
                                        {alertDetail.certainty || alertDetail.severity_level || "Likely"}
                                    </span>
                                </div>
                            </div>

                            {/* Warning Headline */}
                            <div>
                                <strong className="block font-medium text-ink text-sm mb-1">
                                    Official Warning Message
                                </strong>
                                <div className="rounded-xl border border-line bg-mist/20 p-4 font-body text-sm leading-relaxed text-ink whitespace-pre-wrap">
                                    {alertDetail.headline || "No additional text provided."}
                                </div>
                            </div>

                            {/* Instruction / Safety Advisory if provided */}
                            {alertDetail.instruction ? (
                                <div>
                                    <strong className="block font-medium text-ink mb-1">
                                        Emergency Safety Instructions & Advisories
                                    </strong>
                                    <p className="rounded-xl border border-paddy/30 bg-paddy/10 p-3.5 text-ink">
                                        {alertDetail.instruction}
                                    </p>
                                </div>
                            ) : detailError ? (
                                <div>
                                    <strong className="block font-medium text-ink mb-1">
                                        Emergency Safety Instructions & Advisories
                                    </strong>
                                    <p className="rounded-xl border border-horizon/30 bg-horizon/10 p-3.5 text-horizon">
                                        Not available — the full advisory could not be retrieved. Do not assume no
                                        action is required; check the official NDMA/SACHET site or a local authority
                                        for safety instructions.
                                    </p>
                                </div>
                            ) : null}

                            {/* Affected Jurisdictions */}
                            <div>
                                <strong className="block font-medium text-ink mb-1">
                                    Affected Districts & Coordinates
                                </strong>
                                <p className="text-ink-soft">
                                    {alertDetail.area_description ||
                                        alertDetail.area_desc ||
                                        (detailError
                                            ? "Not available — full area details could not be retrieved."
                                            : "Regional coordinates specified in CAP payload.")}
                                </p>
                                {alertDetail.latitude && alertDetail.longitude && (
                                    <p className="mt-1 font-mono text-[0.68rem] text-ink-faint">
                                        Centroid: {alertDetail.latitude.toFixed(4)}°N, {alertDetail.longitude.toFixed(4)}°E
                                        {alertDetail.distance_km !== undefined && ` (${alertDetail.distance_km} km from your location)`}
                                    </p>
                                )}
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-2 border-t border-line pt-3 text-[0.68rem] text-ink-faint">
                                <div>
                                    <span>Issuing Agency: </span>
                                    <strong className="text-ink-soft">{alertDetail.source || alertDetail.sender || "NDMA / IMD"}</strong>
                                </div>
                                <div>
                                    <span>CAP Identifier: </span>
                                    <span className="font-mono text-ink-soft">{alertDetail.identifier}</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="mt-6 flex justify-end border-t border-line pt-4">
                            <button
                                type="button"
                                onClick={handleCloseDetail}
                                className="rounded-lg bg-indigo px-5 py-2 font-body text-xs font-medium text-mist hover:opacity-90"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}