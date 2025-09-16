import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCooP8DyaS0txquRBTWMWqIK7nUiiilW3s",
  authDomain: "eaty-cd6c6.firebaseapp.com",
  projectId: "eaty-cd6c6",
  storageBucket: "eaty-cd6c6.firebasestorage.app",
  messagingSenderId: "1056647426301",
  appId: "1:1056647426301:web:9423cb21c876167b118e94",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
