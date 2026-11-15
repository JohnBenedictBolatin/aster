import { useCallback, useEffect, useRef, useState } from 'react';
import { connectHeartRateDevice, isHeartRateBluetoothAvailable, type HeartRateConnection, type LiveHeartRateSample } from './telemetry/heartRateBle';
import type { TauriBridge } from './aster/storage';

declare global {
  interface Window { __TAURI__?: TauriBridge }
}

export type HeartRateMonitorStatus = 'unsupported' | 'disconnected' | 'connecting' | 'connected' | 'stale';
export type HeartRateMonitorState = {
  status: HeartRateMonitorStatus;
  deviceName: string;
  latest?: LiveHeartRateSample;
  samples: LiveHeartRateSample[];
  error?: string;
};

const initialState = (): HeartRateMonitorState => ({
  status: typeof window !== 'undefined' && window.__TAURI__?.core?.invoke
    ? 'disconnected' : isHeartRateBluetoothAvailable() ? 'disconnected' : 'unsupported',
  deviceName: '',
  samples: [],
});

function explainConnectionError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') return '';
  if (error instanceof DOMException && error.name === 'NotFoundError') return 'No heart-rate wearable was selected.';
  if (error instanceof DOMException && error.name === 'NotAllowedError') return 'Bluetooth access was not granted.';
  if (error instanceof DOMException && error.name === 'SecurityError') return 'Bluetooth is blocked in this app window.';
  return 'Could not connect. Keep the wearable nearby and try again.';
}

export function useHeartRateMonitor() {
  const [state, setState] = useState<HeartRateMonitorState>(initialState);
  const connectionRef = useRef<HeartRateConnection | null>(null);

  const disconnect = useCallback(async () => {
    const connection = connectionRef.current;
    connectionRef.current = null;
    const nativeInvoke = window.__TAURI__?.core?.invoke;
    if (nativeInvoke) await nativeInvoke('stop_heart_rate_monitor').catch(() => undefined);
    await connection?.disconnect();
    setState((current) => ({ ...current,
      status: nativeInvoke || isHeartRateBluetoothAvailable() ? 'disconnected' : 'unsupported',
      latest: undefined, samples: [], error: undefined,
    }));
  }, []);

  const connect = useCallback(async () => {
    const nativeInvoke = window.__TAURI__?.core?.invoke;
    if (nativeInvoke) {
      setState({ status: 'connecting', deviceName: '', samples: [] });
      try {
        const deviceName = await nativeInvoke<string>('start_heart_rate_monitor');
        setState((current) => ({ ...current, status: 'connected', deviceName, error: undefined }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: 'disconnected', deviceName: '', samples: [], error: message });
      }
      return;
    }
    if (!isHeartRateBluetoothAvailable()) {
      setState({ status: 'unsupported', deviceName: '', samples: [], error: 'Bluetooth is unavailable in this browser window. Try a browser with Web Bluetooth support.' });
      return;
    }
    if (connectionRef.current) await disconnect();
    setState({ status: 'connecting', deviceName: '', samples: [] });

    try {
      const connection = await connectHeartRateDevice(
        (sample) => setState((current) => {
          if (!['connecting', 'connected', 'stale'].includes(current.status)) return current;
          const cutoff = sample.receivedAt - 90000;
          const samples = [...current.samples, sample].filter((entry) => entry.receivedAt >= cutoff).slice(-360);
          return { ...current, status: 'connected', latest: sample, samples, error: undefined };
        }),
        () => {
          connectionRef.current = null;
          setState((current) => ({ ...current, status: 'disconnected', error: 'Wearable disconnected. Reconnect to resume live readings.' }));
        },
      );
      connectionRef.current = connection;
      setState((current) => ({ ...current, status: 'connected', deviceName: connection.deviceName }));
    } catch (error) {
      const message = explainConnectionError(error);
      setState({ status: 'disconnected', deviceName: '', samples: [], error: message || undefined });
    }
  }, [disconnect]);

  useEffect(() => {
    const bridge = window.__TAURI__;
    if (!bridge?.event?.listen) return;
    let unlistenSamples: (() => void) | undefined;
    let unlistenStatus: (() => void) | undefined;
    void bridge.event.listen<{
      bpm: number;
      received_at: number;
      sensor_contact: LiveHeartRateSample['sensorContact'];
    }>('aster-hr-sample', ({ payload }) => {
      const sample: LiveHeartRateSample = { bpm: payload.bpm, receivedAt: payload.received_at, sensorContact: payload.sensor_contact };
      setState((current) => {
        if (!['connecting', 'connected', 'stale'].includes(current.status)) return current;
        const cutoff = sample.receivedAt - 90_000;
        const samples = [...current.samples, sample].filter((entry) => entry.receivedAt >= cutoff).slice(-360);
        return { ...current, status: 'connected', latest: sample, samples, error: undefined };
      });
    }).then((unlisten) => { unlistenSamples = unlisten; });
    void bridge.event.listen<string>('aster-hr-status', ({ payload }) => {
      if (payload === 'disconnected') {
        setState((current) => ({ ...current, status: 'disconnected', error: 'Wearable disconnected. Reconnect to resume live readings.' }));
      }
    }).then((unlisten) => { unlistenStatus = unlisten; });
    return () => { unlistenSamples?.(); unlistenStatus?.(); };
  }, []);

  useEffect(() => {
    if (state.status !== 'connected' || !state.latest) return;
    const timer = window.setInterval(() => {
      setState((current) => current.status === 'connected' && current.latest && Date.now() - current.latest.receivedAt > 10000
        ? { ...current, status: 'stale' }
        : current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.latest, state.status]);

  useEffect(() => () => {
    void connectionRef.current?.disconnect();
    const nativeInvoke = window.__TAURI__?.core?.invoke;
    if (nativeInvoke) void nativeInvoke('stop_heart_rate_monitor').catch(() => undefined);
    connectionRef.current = null;
  }, []);

  return { ...state, connect, disconnect };
}
