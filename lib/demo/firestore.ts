/**
 * Sustituto mínimo de `firebase/firestore` para el modo demo (alias en next.config).
 * Implementa solo la API que usa Eaty, sobre `demoStore`.
 */
import { demoStore, registerTimestampFactory } from "./store";

export type DocumentData = Record<string, any>;
export type Firestore = { __demo: true };

export class Timestamp {
  constructor(
    readonly seconds: number,
    readonly nanoseconds: number
  ) {}
  static now(): Timestamp {
    return Timestamp.fromMillis(Date.now());
  }
  static fromDate(d: Date): Timestamp {
    return Timestamp.fromMillis(d.getTime());
  }
  static fromMillis(ms: number): Timestamp {
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }
  toDate(): Date {
    return new Date(this.toMillis());
  }
  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }
  valueOf(): string {
    return String(this.toMillis()).padStart(15, "0");
  }
}

registerTimestampFactory((ms) => Timestamp.fromMillis(ms));

const DELETE = Symbol("deleteField");
class ArrayUnion {
  constructor(readonly items: unknown[]) {}
}

export function deleteField(): any {
  return DELETE;
}
export function arrayUnion(...items: unknown[]): any {
  return new ArrayUnion(items);
}
export function serverTimestamp(): any {
  return Timestamp.now();
}

export function getFirestore(): Firestore {
  return { __demo: true };
}

export class DocumentReference<T = DocumentData> {
  readonly type = "document";
  constructor(readonly path: string) {}
  get id(): string {
    return this.path.split("/").pop()!;
  }
  /** Solo para conservar compatibilidad de tipos. */
  declare readonly __t?: T;
}

export class CollectionReference<T = DocumentData> {
  readonly type = "collection";
  constructor(readonly path: string) {}
  get id(): string {
    return this.path.split("/").pop()!;
  }
  declare readonly __t?: T;
}

type Constraint =
  | { kind: "where"; field: string; op: string; value: unknown }
  | { kind: "orderBy"; field: string; dir: "asc" | "desc" }
  | { kind: "limit"; n: number };
export type QueryConstraint = Constraint;

export class Query<T = DocumentData> {
  constructor(
    readonly collectionPath: string,
    readonly constraints: Constraint[]
  ) {}
  declare readonly __t?: T;
}

function joinPath(base: unknown, segments: string[]): string {
  const prefix =
    base instanceof DocumentReference || base instanceof CollectionReference
      ? [base.path]
      : [];
  return [...prefix, ...segments].join("/");
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4);
}

export function collection(base: unknown, ...segments: string[]): CollectionReference {
  return new CollectionReference(joinPath(base, segments));
}

export function doc(base: unknown, ...segments: string[]): DocumentReference {
  if (base instanceof CollectionReference && segments.length === 0) {
    return new DocumentReference(`${base.path}/${randomId()}`);
  }
  return new DocumentReference(joinPath(base, segments));
}

export function where(field: string, op: string, value: unknown): Constraint {
  return { kind: "where", field, op, value };
}
export function orderBy(field: string, dir: "asc" | "desc" = "asc"): Constraint {
  return { kind: "orderBy", field, dir };
}
export function limit(n: number): Constraint {
  return { kind: "limit", n };
}

export function query(
  ref: CollectionReference | Query,
  ...constraints: Constraint[]
): Query {
  if (ref instanceof Query) return new Query(ref.collectionPath, [...ref.constraints, ...constraints]);
  return new Query(ref.path, constraints);
}

function cmpValue(v: unknown): number | string {
  if (v instanceof Timestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number" || typeof v === "string") return v;
  return String(v ?? "");
}

function getField(data: DocumentData, field: string): unknown {
  return field.split(".").reduce<unknown>((acc, k) => (acc as any)?.[k], data);
}

export class DocumentSnapshot<T = DocumentData> {
  constructor(
    readonly ref: DocumentReference,
    private readonly _data: DocumentData | undefined
  ) {}
  get id(): string {
    return this.ref.id;
  }
  exists(): boolean {
    return this._data !== undefined;
  }
  data(): T {
    return (this._data ? structuredCloneWithTs(this._data) : undefined) as T;
  }
  get(field: string): unknown {
    return this._data ? getField(this._data, field) : undefined;
  }
}
export type QueryDocumentSnapshot<T = DocumentData> = DocumentSnapshot<T>;

export class QuerySnapshot<T = DocumentData> {
  constructor(readonly docs: DocumentSnapshot<T>[]) {}
  get empty(): boolean {
    return this.docs.length === 0;
  }
  get size(): number {
    return this.docs.length;
  }
  forEach(cb: (d: DocumentSnapshot<T>) => void): void {
    this.docs.forEach(cb);
  }
}

function structuredCloneWithTs(value: any): any {
  if (value instanceof Timestamp) return value;
  if (Array.isArray(value)) return value.map(structuredCloneWithTs);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = structuredCloneWithTs(v);
    return out;
  }
  return value;
}

function runQuery(q: Query): QuerySnapshot {
  let rows = demoStore.list(q.collectionPath);
  for (const c of q.constraints) {
    if (c.kind !== "where") continue;
    rows = rows.filter(([, d]) => {
      const a = getField(d, c.field);
      const b = c.value;
      switch (c.op) {
        case "==":
          return cmpValue(a) === cmpValue(b);
        case "!=":
          return cmpValue(a) !== cmpValue(b);
        case ">=":
          return cmpValue(a) >= cmpValue(b);
        case ">":
          return cmpValue(a) > cmpValue(b);
        case "<=":
          return cmpValue(a) <= cmpValue(b);
        case "<":
          return cmpValue(a) < cmpValue(b);
        case "array-contains":
          return Array.isArray(a) && a.includes(b);
        case "in":
          return Array.isArray(b) && b.includes(a);
        default:
          return true;
      }
    });
  }
  for (const c of q.constraints) {
    if (c.kind !== "orderBy") continue;
    const dir = c.dir === "desc" ? -1 : 1;
    rows = [...rows].sort(([, x], [, y]) => {
      const a = cmpValue(getField(x, c.field));
      const b = cmpValue(getField(y, c.field));
      return a < b ? -dir : a > b ? dir : 0;
    });
  }
  const lim = q.constraints.find((c) => c.kind === "limit") as
    | { kind: "limit"; n: number }
    | undefined;
  if (lim) rows = rows.slice(0, lim.n);
  return new QuerySnapshot(
    rows.map(([id, d]) => new DocumentSnapshot(new DocumentReference(`${q.collectionPath}/${id}`), d))
  );
}

function applyWrite(existing: DocumentData | undefined, patch: DocumentData): DocumentData {
  const out: DocumentData = { ...(existing ?? {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === DELETE) {
      delete out[k];
    } else if (v instanceof ArrayUnion) {
      const cur = Array.isArray(out[k]) ? (out[k] as unknown[]) : [];
      out[k] = [...cur, ...v.items.filter((i) => !cur.includes(i))];
    } else if (k.includes(".")) {
      const [head, ...rest] = k.split(".");
      out[head] = applyWrite(out[head] as DocumentData, { [rest.join(".")]: v });
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function getDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
  return new DocumentSnapshot(ref, demoStore.get(ref.path));
}

export async function getDocs(q: Query | CollectionReference): Promise<QuerySnapshot> {
  return runQuery(q instanceof Query ? q : new Query(q.path, []));
}

export async function setDoc(
  ref: DocumentReference,
  data: DocumentData,
  options?: { merge?: boolean }
): Promise<void> {
  const base = options?.merge ? demoStore.get(ref.path) : undefined;
  demoStore.set(ref.path, applyWrite(base, data));
}

export async function addDoc(ref: CollectionReference, data: DocumentData): Promise<DocumentReference> {
  const d = doc(ref);
  demoStore.set(d.path, applyWrite(undefined, data));
  return d;
}

export async function updateDoc(ref: DocumentReference, data: DocumentData): Promise<void> {
  const cur = demoStore.get(ref.path);
  if (!cur) throw new Error(`No document to update: ${ref.path}`);
  demoStore.set(ref.path, applyWrite(cur, data));
}

export async function deleteDoc(ref: DocumentReference): Promise<void> {
  demoStore.delete(ref.path);
}

export function writeBatch() {
  const ops: Array<() => void> = [];
  return {
    set(ref: DocumentReference, data: DocumentData, options?: { merge?: boolean }) {
      ops.push(() => void setDoc(ref, data, options));
      return this;
    },
    update(ref: DocumentReference, data: DocumentData) {
      ops.push(() => void updateDoc(ref, data));
      return this;
    },
    delete(ref: DocumentReference) {
      ops.push(() => demoStore.delete(ref.path));
      return this;
    },
    async commit() {
      ops.forEach((op) => op());
    },
  };
}

export function onSnapshot(
  target: DocumentReference | Query | CollectionReference,
  onNext: (snap: any) => void,
  _onError?: (e: Error) => void
): () => void {
  const emit = () => {
    if (target instanceof DocumentReference) {
      onNext(new DocumentSnapshot(target, demoStore.get(target.path)));
    } else {
      onNext(runQuery(target instanceof Query ? target : new Query(target.path, [])));
    }
  };
  queueMicrotask(emit);
  return demoStore.subscribe(emit);
}

