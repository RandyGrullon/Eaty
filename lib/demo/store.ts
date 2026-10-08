/**
 * Almacén en memoria (persistido en localStorage) que respalda el modo demo.
 * Guarda documentos por ruta completa: "users/demo/meals/abc".
 */
import { seedDemoData } from "./seed";

type Doc = Record<string, unknown>;
type Listener = () => void;

const STORAGE_KEY = "eaty-demo-db-v1";

/** Marca para serializar Timestamps sin perder el tipo. */
const TS_TAG = "__ts";

let docs: Map<string, Doc> | null = null;
const listeners = new Set<Listener>();

function revive(value: unknown, makeTs: (ms: number) => unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => revive(v, makeTs));
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o[TS_TAG] === "number") return makeTs(o[TS_TAG] as number);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) out[k] = revive(v, makeTs);
    return out;
  }
  return value;
}

function serialize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    const maybeTs = value as { toMillis?: () => number };
    if (typeof maybeTs.toMillis === "function") return { [TS_TAG]: maybeTs.toMillis() };
    if (value instanceof Date) return { [TS_TAG]: value.getTime() };
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = serialize(v);
    return out;
  }
  return value;
}

let tsFactory: (ms: number) => unknown = (ms) => new Date(ms);

export function registerTimestampFactory(f: (ms: number) => unknown): void {
  tsFactory = f;
}

function load(): Map<string, Doc> {
  if (docs) return docs;
  docs = new Map();
  let raw: string | null = null;
  try {
    raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
  } catch {
    raw = null;
  }
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, Doc>;
      for (const [path, data] of Object.entries(parsed)) {
        docs.set(path, revive(data, tsFactory) as Doc);
      }
      return docs;
    } catch {
      docs.clear();
    }
  }
  for (const [path, data] of Object.entries(seedDemoData(tsFactory))) {
    docs.set(path, data);
  }
  persist();
  return docs;
}

function persist(): void {
  if (!docs || typeof window === "undefined") return;
  try {
    const obj: Record<string, unknown> = {};
    for (const [path, data] of docs) obj[path] = serialize(data);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Cuota llena o almacenamiento bloqueado: el demo sigue en memoria.
  }
}

let notifyScheduled = false;
function notify(): void {
  if (notifyScheduled) return;
  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    persist();
    for (const l of [...listeners]) l();
  });
}

export const demoStore = {
  get(path: string): Doc | undefined {
    return load().get(path);
  },
  set(path: string, data: Doc): void {
    load().set(path, data);
    notify();
  },
  delete(path: string): void {
    load().delete(path);
    notify();
  },
  /** Documentos hijos directos de una colección. */
  list(collectionPath: string): Array<[string, Doc]> {
    const prefix = collectionPath + "/";
    const out: Array<[string, Doc]> = [];
    for (const [path, data] of load()) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      if (rest.includes("/")) continue;
      out.push([rest, data]);
    }
    return out;
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  reset(): void {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    docs = null;
    load();
    notify();
  },
};
