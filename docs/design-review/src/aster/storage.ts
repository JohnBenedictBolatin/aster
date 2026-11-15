import type { AsterSnapshot } from './domain';

export type TauriBridge = {
  core?: { invoke?: <T>(command: string, args?: Record<string, unknown>) => Promise<T> };
  event?: { listen?: <T>(event: string, handler: (payload: { payload: T }) => void) => Promise<() => void> };
};

declare global {
  interface Window { __TAURI__?: TauriBridge }
}

export type StorageMode = 'opening' | 'desktop' | 'browser' | 'browser-fallback' | 'saving' | 'saved' | 'error';

const DATABASE = 'aster-local-v1';
const STORE = 'workspace';

function nativeInvoke() { return window.__TAURI__?.core?.invoke; }

export function upgradeSnapshot(value: unknown): AsterSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const snapshot = value as Partial<AsterSnapshot>;
  if (!snapshot.workspaces || !snapshot.workspaces.recovery || !snapshot.workspaces.cabin || !snapshot.workspaces.radiation) return null;
  const version = (snapshot as { schemaVersion?: number }).schemaVersion;
  const workspaces = Object.fromEntries((['recovery', 'cabin', 'radiation'] as const).map((key) => [key, {
    ...snapshot.workspaces![key]!, checklist: snapshot.workspaces![key]!.checklist ?? {},
    reviewProgress: snapshot.workspaces![key]!.reviewProgress ?? { version: 1, skipped: [], inspections: {} },
  }])) as AsterSnapshot['workspaces'];
  if (version === 2 && snapshot.scenarioTimes) return { ...snapshot, workspaces } as AsterSnapshot;
  if (version === 1 && snapshot.scenarioNow) {
    return { ...snapshot, workspaces, schemaVersion: 2, scenarioTimes: {
      recovery: snapshot.scenarioNow, cabin: snapshot.scenarioNow, radiation: snapshot.scenarioNow,
    } } as AsterSnapshot;
  }
  return null;
}

function browserDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('Browser storage is unavailable.')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

function readIndexedDB(): Promise<AsterSnapshot | null> {
  return browserDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get('current');
    request.onsuccess = () => resolve(upgradeSnapshot(request.result?.value));
    request.onerror = () => reject(request.error ?? new Error('Could not read local records.'));
    transaction.oncomplete = () => database.close();
  }));
}

function writeIndexedDB(snapshot: AsterSnapshot): Promise<void> {
  return browserDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put({ id: 'current', value: snapshot });
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save local records.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Saving local records was cancelled.'));
  }));
}

function readFallback(): AsterSnapshot | null {
  const stored = localStorage.getItem(DATABASE);
  if (!stored) return null;
  const value: unknown = JSON.parse(stored);
  return upgradeSnapshot(value);
}

export async function loadWorkspace(): Promise<{ snapshot: AsterSnapshot | null; mode: StorageMode }> {
  const invoke = nativeInvoke();
  if (invoke) {
    try {
      const nativeSnapshot = await invoke<unknown>('load_vault');
      return { snapshot: upgradeSnapshot(nativeSnapshot), mode: 'desktop' };
    } catch {
      try { return { snapshot: await readIndexedDB(), mode: 'browser-fallback' }; }
      catch { return { snapshot: readFallback(), mode: 'browser-fallback' }; }
    }
  }
  try { return { snapshot: await readIndexedDB(), mode: 'browser' }; }
  catch { return { snapshot: readFallback(), mode: 'browser-fallback' }; }
}

export async function saveWorkspace(snapshot: AsterSnapshot): Promise<'desktop' | 'browser' | 'browser-fallback'> {
  const invoke = nativeInvoke();
  if (invoke) {
    try { await invoke('save_vault', { snapshot }); return 'desktop'; }
    catch {
      try { await writeIndexedDB(snapshot); return 'browser-fallback'; }
      catch { localStorage.setItem(DATABASE, JSON.stringify(snapshot)); return 'browser-fallback'; }
    }
  }
  try { await writeIndexedDB(snapshot); return 'browser'; }
  catch { localStorage.setItem(DATABASE, JSON.stringify(snapshot)); return 'browser-fallback'; }
}
