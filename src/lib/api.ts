const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

async function handle(res: Response) {
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new ApiError(res.status, text);
    }
    return res.json();
}

// ---- Weather ----

export interface GeoLocation {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
}

export interface CurrentWeatherData {
    temperature: number;
    windspeed_kmh: number;
    winddirection?: number;
    weathercode: number;
    humidity?: number;
    apparent_temperature?: number;
    precipitation?: number;
    surface_pressure?: number;
    is_day?: number;
    time?: string;
}

export interface CurrentWeatherResponse {
    location: GeoLocation;
    current_weather: CurrentWeatherData;
}

export async function getCurrentWeather(location: string): Promise<CurrentWeatherResponse> {
    const res = await fetch(`${BASE}/weather/current?location=${encodeURIComponent(location)}`);
    return handle(res);
}

export async function getCurrentWeatherByCoords(lat: number, lon: number): Promise<CurrentWeatherResponse> {
    const res = await fetch(`${BASE}/weather/current?lat=${lat}&lon=${lon}`);
    return handle(res);
}

// ---- Disaster Alerts (SACHET / NDMA) ----

export interface DisasterAlert {
    identifier: string;
    event: string;
    severity: string; // e.g. "ALERT", "WARNING", "WATCH"
    severity_color?: string; // e.g. "red", "orange", "yellow", "green"
    severity_level?: string; // e.g. "Severe", "Likely", "Moderate"
    headline: string;
    area_description?: string;
    source?: string;
    language?: string;
    effective_start?: string;
    effective_end?: string;
    latitude?: number;
    longitude?: number;
    distance_km?: number;
}

export interface DisasterAlertDetail extends DisasterAlert {
    sender?: string;
    sent?: string;
    urgency?: string;
    certainty?: string;
    effective?: string;
    expires?: string;
    instruction?: string;
    area_desc?: string;
}

export async function getActiveAlerts(
    lat?: number,
    lon?: number,
    radiusKm?: number
): Promise<DisasterAlert[]> {
    let url = `${BASE}/alerts`;
    const params = new URLSearchParams();
    if (lat !== undefined && lon !== undefined) {
        params.append("lat", lat.toString());
        params.append("lon", lon.toString());
        if (radiusKm !== undefined) {
            params.append("radius_km", radiusKm.toString());
        }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    const res = await fetch(url);
    return handle(res);
}

export async function getAlertDetail(identifier: string): Promise<DisasterAlertDetail> {
    const res = await fetch(`${BASE}/alerts/${encodeURIComponent(identifier)}`);
    return handle(res);
}

export interface ForecastResponse {
    location: GeoLocation;
    forecast: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
    };
}

export async function getForecast(location: string, days = 5): Promise<ForecastResponse> {
    const res = await fetch(
        `${BASE}/weather/forecast?location=${encodeURIComponent(location)}&days=${days}`
    );
    return handle(res);
}

export interface HistoricalResponse {
    location: GeoLocation;
    historical: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
    };
}

export async function getHistorical(
    location: string,
    startDate: string,
    endDate: string
): Promise<HistoricalResponse> {
    const res = await fetch(
        `${BASE}/weather/historical?location=${encodeURIComponent(
            location
        )}&start_date=${startDate}&end_date=${endDate}`
    );
    return handle(res);
}

// ---- Chat ----

export interface ChatResponse {
    response: string;
    language: string;
    location_name?: string;
    query_type?: string;
    raw_data?: Record<string, unknown>;
}

export async function chat(message: string, language?: string): Promise<ChatResponse> {
    const res = await fetch(`${BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, language }),
    });
    return handle(res);
}

/**
 * Streams the /chat/stream response. Deliberately NOT using EventSource —
 * EventSource only supports GET requests, and this endpoint needs a POST
 * body. This reads the raw ReadableStream and parses SSE-style `data: {...}`
 * lines by hand instead.
 */
export async function chatStream(
    message: string,
    language: string | undefined,
    onDelta: (text: string) => void,
    onDone: (meta: { location_name?: string; query_type?: string }) => void,
    onError?: (err: Error) => void
): Promise<void> {
    try {
        const res = await fetch(`${BASE}/chat/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, language }),
        });

        if (!res.ok || !res.body) {
            const text = await res.text().catch(() => res.statusText);
            throw new ApiError(res.status, text);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // SSE messages are separated by a blank line
            const parts = buffer.split("\n\n");
            buffer = parts.pop() ?? "";

            for (const part of parts) {
                const line = part.replace(/^data:\s*/, "").trim();
                if (!line) continue;
                const payload = JSON.parse(line);
                if (payload.delta) onDelta(payload.delta);
                if (payload.done) onDone(payload);
            }
        }
    } catch (err) {
        if (onError) onError(err as Error);
        else throw err;
    }
}

// ---- Translate ----

export interface TranslateResponse {
    translated_text: string;
}

export async function translate(
    text: string,
    targetLanguage: string,
    sourceLanguage = "auto"
): Promise<TranslateResponse> {
    const res = await fetch(`${BASE}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            text,
            source_language: sourceLanguage,
            target_language: targetLanguage,
        }),
    });
    return handle(res);
}

/** Friendly, specific error messages for the two status codes the backend
 * returns deliberately (see Backend_Implementation_Plan.md) — never show a
 * raw stack trace or generic "something went wrong" to the user. */
export function friendlyErrorMessage(err: unknown): string {
    if (err instanceof ApiError) {
        if (err.status === 404) {
            return "Couldn't find that location — try a nearby larger town or city.";
        }
        if (err.status === 422) {
            return "Couldn't understand that — try asking about a specific place and time (e.g. \"weather in Pune tomorrow\").";
        }
    }
    return "Something went wrong reaching WeatherGPT. Please try again in a moment.";
}