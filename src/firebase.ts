import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC6Xi1RCWbbfJ-e_wgWi7vr_kcxAlC5b80",
  authDomain: "gen-lang-client-0314702126.firebaseapp.com",
  projectId: "gen-lang-client-0314702126",
  storageBucket: "gen-lang-client-0314702126.firebasestorage.app",
  messagingSenderId: "874931430882",
  appId: "1:874931430882:web:0ebca9cfb0f2157f73c5bb"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Use custom firestoreDatabaseId if specified, or default if blank
export const db = getFirestore(app, "ai-studio-educonnect-1af6ada9-f264-4258-aa8d-9d52a528dba3");
