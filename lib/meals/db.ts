import { appFirebase } from "../firebase";

/** Acceso perezoso a Firestore compartido por los módulos de meals. */
export const getDb = () => appFirebase.db;
