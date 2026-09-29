"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLiveTelemetry, type LiveTelemetry } from "@/api/telemetry";

interface LiveTelemetryState extends LiveTelemetry {
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

/**
 * Shared live-telemetry poller (Laravel GET /telemetry/live).
 * - Polls every `intervalMs` (default 15s).
 * - `live` is true only when the last poll succeeded — UI badges must use
 *   it instead of assuming connectivity.
 * - On failure the last good snapshot is kept but `error` is set so callers
 *   can hide live-only chrome honestly.
 */
export function useLiveTelemetry(intervalMs = 15000): LiveTelemetryState & { live: boolean } {
  const [vehicles, setVehicles] = useState<LiveTelemetry["vehicles"]>([]);
  const [count, setCount] = useState(0);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const snap = await fetchLiveTelemetry();
      setVehicles(snap.vehicles);
      setCount(snap.count);
      setTimestamp(snap.timestamp);
      setError(false);
      setLive(true);
    } catch {
      setError(true);
      setLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await poll();
    })();
    timer.current = setInterval(() => {
      if (!cancelled) void poll();
    }, intervalMs);
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [poll, intervalMs]);

  return { vehicles, count, timestamp, loading, error, live, refresh: poll };
}
