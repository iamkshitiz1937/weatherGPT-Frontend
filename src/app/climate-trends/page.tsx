"use client";

import { useState, useMemo, useEffect } from "react";
import {
    getHistorical,
    friendlyErrorMessage,
    type HistoricalResponse,
} from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
} from "recharts";

type PresetRange = "30d" | "90d" | "1y" | "5y" | "custom";
type AggregationMode = "daily" | "weekly" | "monthly";

function getIsoDate(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
}

// Open-Meteo historical archive has a typical 5-day latency
const DEFAULT_END_OFFSET = 5;

const PRESETS: { key: PresetRange; label: string; days: number }[] = [
    { key: "30d", label: "Last 30 days", days: 30 },
    { key: "90d", label: "Last 90 days", days: 90 },
    { key: "1y", label: "Last 12 months", days: 365 },
    { key: "5y", label: "Last 5 years", days: 1825 },
];

// maxTemp/minTemp/precip are `null` (not 0) when the underlying reading is
// missing, so the chart renders a gap instead of a fabricated data point.
interface AggregatedPoint {
    date: string;
    maxTemp: number | null;
    minTemp: number | null;
    precip: number | null;
}

export default function ClimateTrendsPage() {
    const mounted = useMounted();
    const [location, setLocation] = useState("Delhi");
    const [selectedPreset, setSelectedPreset] = useState<PresetRange>("30d");
    const [startDate, setStartDate] = useState(getIsoDate(35));
    const [endDate, setEndDate] = useState(getIsoDate(DEFAULT_END_OFFSET));
    const [aggMode, setAggMode] = useState<AggregationMode>("daily");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<HistoricalResponse | null>(null);

    useEffect(() => {
        let ignore = false;
        getHistorical("Delhi", getIsoDate(35), getIsoDate(DEFAULT_END_OFFSET))
            .then((res) => {
                if (!ignore) {
                    setData(res);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (!ignore) {
                    setError(friendlyErrorMessage(err));
                    setLoading(false);
                }
            });

        return () => {
            ignore = true;
        };
    }, []);

    async function fetchTrends(loc: string, start: string, end: string) {
        const trimmed = loc.trim();
        if (!trimmed) return;

        setLoading(true);
        setError(null);

        try {
            const res = await getHistorical(trimmed, start, end);
            setData(res);
        } catch (err) {
            setError(friendlyErrorMessage(err));
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    function handlePresetChange(preset: PresetRange) {
        setSelectedPreset(preset);
        if (preset === "custom") return;

        const match = PRESETS.find((p) => p.key === preset);
        if (!match) return;

        const newEnd = getIsoDate(DEFAULT_END_OFFSET);
        const newStart = getIsoDate(DEFAULT_END_OFFSET + match.days);

        setStartDate(newStart);
        setEndDate(newEnd);

        // Auto-adjust default aggregation mode for chart legibility
        if (match.days <= 45) {
            setAggMode("daily");
        } else if (match.days <= 180) {
            setAggMode("weekly");
        } else {
            setAggMode("monthly");
        }

        fetchTrends(location, newStart, newEnd);
    }

    function handleCustomSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSelectedPreset("custom");
        fetchTrends(location, startDate, endDate);
    }

    // Downsample / aggregate data client-side for chart legibility.
    // Missing/null source readings are kept as `null` output (never coerced to
    // 0) so Recharts renders a gap in the line instead of a fake data point.
    const chartData: AggregatedPoint[] = useMemo(() => {
        if (
            !data ||
            !data.historical ||
            !Array.isArray(data.historical.time) ||
            !Array.isArray(data.historical.temperature_2m_max) ||
            !Array.isArray(data.historical.temperature_2m_min) ||
            !Array.isArray(data.historical.precipitation_sum)
        ) {
            return [];
        }

        const times = data.historical.time;
        const maxs = data.historical.temperature_2m_max;
        const mins = data.historical.temperature_2m_min;
        const precips = data.historical.precipitation_sum;

        const toNumOrNull = (v: number | null | undefined): number | null =>
            v === null || v === undefined || Number.isNaN(v) ? null : Number(v.toFixed(1));

        if (aggMode === "daily" || times.length <= 35) {
            return times.map((t, i) => ({
                date: t,
                maxTemp: toNumOrNull(maxs[i]),
                minTemp: toNumOrNull(mins[i]),
                precip: toNumOrNull(precips[i]),
            }));
        }

        if (aggMode === "weekly") {
            const points: AggregatedPoint[] = [];
            const chunkSize = 7;
            for (let i = 0; i < times.length; i += chunkSize) {
                const sliceTime = times[i];
                const sliceMax = maxs.slice(i, i + chunkSize).filter((v) => v !== null && v !== undefined && !isNaN(v));
                const sliceMin = mins.slice(i, i + chunkSize).filter((v) => v !== null && v !== undefined && !isNaN(v));
                const slicePrecip = precips.slice(i, i + chunkSize).filter((v) => v !== null && v !== undefined && !isNaN(v));

                // If every reading in the window is missing, leave the point as
                // null rather than plotting an average of zero.
                const avgMax = sliceMax.length ? sliceMax.reduce((a, b) => a + b, 0) / sliceMax.length : null;
                const avgMin = sliceMin.length ? sliceMin.reduce((a, b) => a + b, 0) / sliceMin.length : null;
                const sumPrecip = slicePrecip.length ? slicePrecip.reduce((a, b) => a + b, 0) : null;

                points.push({
                    date: sliceTime,
                    maxTemp: avgMax !== null ? Number(avgMax.toFixed(1)) : null,
                    minTemp: avgMin !== null ? Number(avgMin.toFixed(1)) : null,
                    precip: sumPrecip !== null ? Number(sumPrecip.toFixed(1)) : null,
                });
            }
            return points;
        }

        // Monthly aggregation
        const monthBuckets: {
            [key: string]: { maxs: number[]; mins: number[]; precips: number[] };
        } = {};

        times.forEach((t, i) => {
            const monthKey = t.slice(0, 7); // "YYYY-MM"
            if (!monthBuckets[monthKey]) {
                monthBuckets[monthKey] = { maxs: [], mins: [], precips: [] };
            }
            if (maxs[i] != null) monthBuckets[monthKey].maxs.push(maxs[i]);
            if (mins[i] != null) monthBuckets[monthKey].mins.push(mins[i]);
            if (precips[i] != null) monthBuckets[monthKey].precips.push(precips[i]);
        });

        return Object.entries(monthBuckets).map(([mKey, bucket]) => {
            const avgMax = bucket.maxs.length
                ? bucket.maxs.reduce((a, b) => a + b, 0) / bucket.maxs.length
                : null;
            const avgMin = bucket.mins.length
                ? bucket.mins.reduce((a, b) => a + b, 0) / bucket.mins.length
                : null;
            const sumPrecip = bucket.precips.length
                ? bucket.precips.reduce((a, b) => a + b, 0)
                : null;

            return {
                date: mKey,
                maxTemp: avgMax !== null ? Number(avgMax.toFixed(1)) : null,
                minTemp: avgMin !== null ? Number(avgMin.toFixed(1)) : null,
                precip: sumPrecip !== null ? Number(sumPrecip.toFixed(1)) : null,
            };
        });
    }, [data, aggMode]);

    // Summary statistics
    const summaryStats = useMemo(() => {
        if (
            !data ||
            !data.historical ||
            !Array.isArray(data.historical.temperature_2m_max) ||
            !Array.isArray(data.historical.temperature_2m_min) ||
            !Array.isArray(data.historical.precipitation_sum)
        ) {
            return null;
        }
        const maxs = data.historical.temperature_2m_max.filter((v) => v != null && !isNaN(v));
        const mins = data.historical.temperature_2m_min.filter((v) => v != null && !isNaN(v));
        const precips = data.historical.precipitation_sum.filter((v) => v != null && !isNaN(v));

        if (!maxs.length || !mins.length) return null;

        const highest = Math.max(...maxs);
        const lowest = Math.min(...mins);
        const avgMax = maxs.reduce((a, b) => a + b, 0) / maxs.length;
        const totalPrecip = precips.reduce((a, b) => a + b, 0);

        return {
            highest: highest.toFixed(1),
            lowest: lowest.toFixed(1),
            avgMax: avgMax.toFixed(1),
            totalPrecip: totalPrecip.toFixed(1),
            totalDays: maxs.length,
        };
    }, [data]);

    return (
        <div className="mx-auto max-w-5xl px-6 py-10 md:py-16">
            {/* Header */}
            <div className="max-w-2xl">
                <h1 className="font-display text-3xl text-indigo md:text-4xl">
                    Climate & historical trends
                </h1>
                <p className="mt-2 font-body text-sm text-ink-soft leading-relaxed">
                    See how temperature and precipitation have changed over time for any location in India.
                </p>
                <p className="mt-1 font-body text-xs text-paddy">
                    Observed historical measurements from meteorological station archives, not climate projections.
                </p>
            </div>

            {/* Controls: Location + Presets + Custom Range */}
            <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
                <form onSubmit={handleCustomSubmit} className="space-y-5">
                    {/* Location input */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <label
                            htmlFor="climate-loc"
                            className="font-body text-xs font-medium uppercase tracking-wider text-ink-faint sm:w-28"
                        >
                            Location
                        </label>
                        <input
                            id="climate-loc"
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. Delhi, Jaipur, Mumbai…"
                            disabled={loading}
                            className="flex-1 rounded-md border border-line bg-surface px-3.5 py-2 font-body text-sm text-ink outline-none transition-colors hover:border-indigo/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo disabled:opacity-50"
                        />
                    </div>

                    {/* Preset Buttons */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <span className="font-body text-xs font-medium uppercase tracking-wider text-ink-faint sm:w-28">
                            Range
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => handlePresetChange(p.key)}
                                    disabled={loading}
                                    className={`rounded-full px-3.5 py-1.5 font-body text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo ${selectedPreset === p.key
                                            ? "bg-indigo text-mist font-medium"
                                            : "border border-line bg-surface hover:border-indigo/50 text-ink-soft"
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setSelectedPreset("custom")}
                                disabled={loading}
                                className={`rounded-full px-3.5 py-1.5 font-body text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo ${selectedPreset === "custom"
                                        ? "bg-indigo text-mist font-medium"
                                        : "border border-line bg-surface hover:border-indigo/50 text-ink-soft"
                                    }`}
                            >
                                Custom dates
                            </button>
                        </div>
                    </div>

                    {/* Custom Date Inputs if selected */}
                    {selectedPreset === "custom" && (
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:pl-28">
                            <div className="flex items-center gap-2">
                                <label htmlFor="start-date" className="font-body text-xs text-ink-faint">
                                    From:
                                </label>
                                <input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    max={endDate}
                                    className="rounded-md border border-line bg-surface px-2.5 py-1.5 font-body text-xs text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="end-date" className="font-body text-xs text-ink-faint">
                                    To:
                                </label>
                                <input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    max={getIsoDate(DEFAULT_END_OFFSET)}
                                    className="rounded-md border border-line bg-surface px-2.5 py-1.5 font-body text-xs text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !location.trim()}
                                className="rounded-md bg-indigo px-4 py-1.5 font-body text-xs font-medium text-mist transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                            >
                                Apply Range
                            </button>
                        </div>
                    )}
                </form>
            </div>

            {/* Error state */}
            {error && !loading && (
                <div className="mt-8 rounded-xl border border-horizon/30 bg-surface p-5">
                    <p className="font-body text-sm font-medium text-horizon">{error}</p>
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="mt-12 space-y-6" aria-busy="true" aria-label="Loading historical climate data">
                    <div className="h-20 rounded-xl border border-line bg-surface/40 animate-pulse" />
                    <div className="h-80 rounded-2xl border border-line bg-surface/40 animate-pulse" />
                    <div className="h-64 rounded-2xl border border-line bg-surface/40 animate-pulse" />
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && data && !summaryStats && (
                <div className="mt-8 rounded-xl border border-line bg-surface p-6 text-center">
                    <p className="font-body text-sm text-ink-soft">
                        No historical weather observations available for this date range.
                    </p>
                </div>
            )}

            {/* Results */}
            {!loading && data && summaryStats && mounted && (
                <div className="mt-10 space-y-10">
                    {/* Location summary strip */}
                    <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
                        <div>
                            <span className="font-body text-xs uppercase tracking-wider text-paddy">
                                Historical Climate Record
                            </span>
                            <h2 className="mt-1 font-display text-2xl text-indigo md:text-3xl">
                                {data.location.name}
                                {data.location.country && (
                                    <span className="ml-2 font-body text-base font-normal text-ink-soft">
                                        ({data.location.country})
                                    </span>
                                )}
                            </h2>
                            <p className="mt-1 font-body text-xs text-ink-faint">
                                Span: {startDate} to {endDate} ({summaryStats.totalDays} daily records)
                            </p>
                        </div>

                        {/* Aggregation Level Controls */}
                        <div className="flex items-center gap-1.5">
                            <span className="font-body text-xs text-ink-faint mr-1">View:</span>
                            {(["daily", "weekly", "monthly"] as AggregationMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setAggMode(mode)}
                                    className={`rounded-md px-2.5 py-1 font-body text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${aggMode === mode
                                            ? "bg-indigo text-mist font-medium"
                                            : "border border-line bg-surface text-ink-soft hover:border-indigo/40"
                                        }`}
                                >
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-xl border border-line bg-surface p-4">
                            <p className="font-body text-xs text-ink-faint">Highest Max Temp</p>
                            <p className="mt-1 font-display text-2xl text-horizon">
                                {summaryStats.highest}°C
                            </p>
                        </div>
                        <div className="rounded-xl border border-line bg-surface p-4">
                            <p className="font-body text-xs text-ink-faint">Lowest Min Temp</p>
                            <p className="mt-1 font-display text-2xl text-indigo">
                                {summaryStats.lowest}°C
                            </p>
                        </div>
                        <div className="rounded-xl border border-line bg-surface p-4">
                            <p className="font-body text-xs text-ink-faint">Average Daily Max</p>
                            <p className="mt-1 font-display text-2xl text-ink">
                                {summaryStats.avgMax}°C
                            </p>
                        </div>
                        <div className="rounded-xl border border-line bg-surface p-4">
                            <p className="font-body text-xs text-ink-faint">Total Rainfall</p>
                            <p className="mt-1 font-display text-2xl text-paddy">
                                {summaryStats.totalPrecip} mm
                            </p>
                        </div>
                    </div>

                    {/* Temperature Trend Chart */}
                    <div className="rounded-2xl border border-line bg-surface p-6">
                        <div className="mb-4">
                            <h3 className="font-display text-lg text-ink">
                                Temperature history
                            </h3>
                            <p className="font-body text-xs text-ink-faint">
                                {aggMode === "daily"
                                    ? "Daily recorded maximum and minimum temperatures (°C)"
                                    : `Averaged ${aggMode} maximum and minimum temperatures (°C)`}
                                {" · gaps in the line indicate missing station readings, not 0°C"}
                            </p>
                        </div>

                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="var(--color-ink-faint)"
                                        fontSize={11}
                                        tickLine={false}
                                        tickFormatter={(val) => {
                                            if (val.length > 7) return val.slice(5); // MM-DD
                                            return val; // YYYY-MM
                                        }}
                                    />
                                    <YAxis
                                        stroke="var(--color-ink-faint)"
                                        fontSize={11}
                                        tickLine={false}
                                        unit="°"
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "var(--color-surface)",
                                            borderColor: "var(--color-line)",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                            color: "var(--color-ink)",
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        wrapperStyle={{ fontSize: "12px", paddingBottom: "8px" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="maxTemp"
                                        name="Max Temp (°C)"
                                        stroke="var(--color-horizon)"
                                        strokeWidth={2}
                                        dot={chartData.length < 40}
                                        activeDot={{ r: 5 }}
                                        connectNulls={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="minTemp"
                                        name="Min Temp (°C)"
                                        stroke="var(--color-indigo)"
                                        strokeWidth={2}
                                        dot={chartData.length < 40}
                                        activeDot={{ r: 5 }}
                                        connectNulls={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Precipitation Chart */}
                    <div className="rounded-2xl border border-line bg-surface p-6">
                        <div className="mb-4">
                            <h3 className="font-display text-lg text-ink">
                                Precipitation volume
                            </h3>
                            <p className="font-body text-xs text-ink-faint">
                                {aggMode === "daily"
                                    ? "Daily cumulative rainfall (mm)"
                                    : `Aggregated ${aggMode} total rainfall (mm)`}
                            </p>
                        </div>

                        <div className="h-60 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="var(--color-ink-faint)"
                                        fontSize={11}
                                        tickLine={false}
                                        tickFormatter={(val) => {
                                            if (val.length > 7) return val.slice(5);
                                            return val;
                                        }}
                                    />
                                    <YAxis
                                        stroke="var(--color-ink-faint)"
                                        fontSize={11}
                                        tickLine={false}
                                        unit="mm"
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "var(--color-surface)",
                                            borderColor: "var(--color-line)",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                            color: "var(--color-ink)",
                                        }}
                                    />
                                    <Bar
                                        dataKey="precip"
                                        name="Precipitation (mm)"
                                        fill="var(--color-paddy)"
                                        radius={[3, 3, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}