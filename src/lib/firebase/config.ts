// ────────────────────────────────────────────────────────────
// Firebase Configuration และ Firestore Instance
// ────────────────────────────────────────────────────────────

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAAXAgFYqnLfvqEQJw6Y4_QoavDo6yCOhI",
  authDomain: "gardanmaster-2d5db.firebaseapp.com",
  projectId: "gardanmaster-2d5db",
  storageBucket: "gardanmaster-2d5db.firebasestorage.app",
  messagingSenderId: "871678518614",
  appId: "1:871678518614:web:25f87462b286e338c9e2f7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
