import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Meal } from '@/types/meal';

interface EatyDB extends DBSchema {
  pendingMeals: {
    key: string;
    value: {
      id: string;
      userId: string;
      mealData: Omit<Meal, 'id' | 'createdAt'>;
      imageBlob?: Blob;
      createdAt: number;
    };
    indexes: { 'by-user': string };
  };
}

const DB_NAME = 'eaty-offline-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EatyDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<EatyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const mealStore = db.createObjectStore('pendingMeals', {
          keyPath: 'id',
        });
        mealStore.createIndex('by-user', 'userId');
      },
    });
  }
  return dbPromise;
}

export async function saveMealOffline(
  userId: string,
  mealData: Omit<Meal, 'id' | 'createdAt'>,
  imageFile?: File
) {
  const db = await getDB();
  const id = crypto.randomUUID();
  
  let imageBlob: Blob | undefined;
  if (imageFile) {
    // Convert File to Blob for IndexedDB storage
    imageBlob = new Blob([await imageFile.arrayBuffer()], { type: imageFile.type });
  }

  await db.add('pendingMeals', {
    id,
    userId,
    mealData,
    imageBlob,
    createdAt: Date.now(),
  });

  return id;
}

export async function getPendingMeals(userId: string) {
  const db = await getDB();
  return db.getAllFromIndex('pendingMeals', 'by-user', userId);
}

export async function deletePendingMeal(id: string) {
  const db = await getDB();
  await db.delete('pendingMeals', id);
}

export async function hasPendingMeals(userId: string): Promise<boolean> {
  const meals = await getPendingMeals(userId);
  return meals.length > 0;
}
