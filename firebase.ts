
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';

// Zastąp poniższe wartości danymi ze swojej konsoli Firebase:
// Project Settings -> General -> Your apps -> SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyCnSja4w8-CAMdcTDNdmaVjAd5zRi7cOso",
  authDomain: "domowy-budzet-eed4a.firebaseapp.com",
  projectId: "domowy-budzet-eed4a",
  storageBucket: "domowy-budzet-eed4a.firebasestorage.app",
  messagingSenderId: "625717911672",
  appId: "1:625717911672:web:571343eccbc26233ad8d8d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Inicjalizacja Firestore z włączoną obsługą offline (cache)
// Dzięki temu aplikacja działa płynnie nawet przy słabym internecie
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
