/**
 * Sustituto de `firebase/auth` para el modo demo: un único usuario local
 * cuyo estado de sesión vive en localStorage.
 */
const SESSION_KEY = "eaty-demo-session";

export type Auth = { __demo: true; currentUser: User | null };

export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  providerData: unknown[];
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  delete: () => Promise<void>;
};

type Session = { email: string | null; displayName: string | null; isAnonymous: boolean };
type Listener = (u: User | null) => void;

const listeners = new Set<Listener>();
const auth: Auth = { __demo: true, currentUser: null };

function makeUser(s: Session): User {
  return {
    uid: "demo-user",
    email: s.email,
    displayName: s.displayName,
    photoURL: null,
    isAnonymous: s.isAnonymous,
    providerData: [],
    getIdToken: async () => "demo-token",
    delete: async () => setSession(null),
  };
}

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function setSession(s: Session | null): void {
  try {
    if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
  auth.currentUser = s ? makeUser(s) : null;
  for (const l of [...listeners]) l(auth.currentUser);
}

let initialized = false;
export function getAuth(): Auth {
  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    const s = readSession();
    auth.currentUser = s ? makeUser(s) : null;
  }
  return auth;
}

export class GoogleAuthProvider {
  readonly providerId = "google.com";
}

export const EmailAuthProvider = {
  credential(email: string, _password: string) {
    return { providerId: "password", email };
  },
};

export function onAuthStateChanged(a: Auth, cb: Listener): () => void {
  listeners.add(cb);
  const current = getAuth().currentUser;
  setTimeout(() => cb(current), 150);
  return () => listeners.delete(cb);
}

const DEMO_NAME = "Alex Demo";

async function delay(): Promise<void> {
  await new Promise((r) => setTimeout(r, 400));
}

export async function signInWithEmailAndPassword(_a: Auth, email: string, _p: string) {
  await delay();
  setSession({ email, displayName: DEMO_NAME, isAnonymous: false });
  return { user: auth.currentUser! };
}

export async function createUserWithEmailAndPassword(_a: Auth, email: string, _p: string) {
  await delay();
  setSession({ email, displayName: DEMO_NAME, isAnonymous: false });
  return { user: auth.currentUser! };
}

export async function signInWithPopup(_a: Auth, _p: unknown) {
  await delay();
  setSession({ email: "alex@demo.eaty.app", displayName: DEMO_NAME, isAnonymous: false });
  return { user: auth.currentUser! };
}

export async function signInWithRedirect(a: Auth, p: unknown) {
  await signInWithPopup(a, p);
}

export async function getRedirectResult() {
  return null;
}

export async function signInAnonymously(_a: Auth) {
  await delay();
  setSession({ email: null, displayName: null, isAnonymous: true });
  return { user: auth.currentUser! };
}

export async function linkWithCredential(_u: User, cred: { email: string }) {
  await delay();
  setSession({ email: cred.email, displayName: DEMO_NAME, isAnonymous: false });
  return { user: auth.currentUser! };
}

export async function linkWithPopup(_u: User, _p: unknown) {
  await delay();
  setSession({ email: "alex@demo.eaty.app", displayName: DEMO_NAME, isAnonymous: false });
  return { user: auth.currentUser! };
}

export async function signOut(_a: Auth) {
  setSession(null);
}

export async function sendPasswordResetEmail(_a: Auth, _email: string) {
  await delay();
}
