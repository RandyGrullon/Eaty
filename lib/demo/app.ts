/** Sustituto de `firebase/app` para el modo demo. */
export type FirebaseApp = { name: string; options: Record<string, unknown> };

const apps: FirebaseApp[] = [];

export function initializeApp(options: Record<string, unknown> = {}): FirebaseApp {
  const app = { name: "[DEFAULT]", options };
  apps.push(app);
  return app;
}

export function getApps(): FirebaseApp[] {
  return apps;
}

export function getApp(): FirebaseApp {
  return apps[0] ?? initializeApp();
}
