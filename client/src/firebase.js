import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'task-app-b709e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'task-app-b709e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'task-app-b709e.appspot.com',
  ...(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? { messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID } : {}),
  ...(import.meta.env.VITE_FIREBASE_APP_ID ? { appId: import.meta.env.VITE_FIREBASE_APP_ID } : {})
};

// Check if config has required API key
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY'
);

let app;
let auth;

try {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (error) {
  console.warn('[Firebase Client] Initialization warning:', error.message);
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { auth };

/**
 * Sign in with Email and Password
 */
export const loginWithEmail = async (email, password) => {
  if (!auth) throw new Error('Firebase Auth is not initialized. Please configure API keys.');
  return await signInWithEmailAndPassword(auth, email, password);
};

/**
 * Sign up with Email and Password
 */
export const registerWithEmail = async (email, password, displayName) => {
  if (!auth) throw new Error('Firebase Auth is not initialized. Please configure API keys.');
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential;
};

/**
 * Sign in with Google Popup
 */
export const loginWithGoogle = async () => {
  if (!auth) throw new Error('Firebase Auth is not initialized. Please configure API keys.');
  return await signInWithPopup(auth, googleProvider);
};

/**
 * Log out current user
 */
export const logoutUser = async () => {
  if (!auth) return;
  return await signOut(auth);
};

/**
 * Get current user's Firebase ID token
 */
export const getCurrentUserToken = async (forceRefresh = false) => {
  if (!auth || !auth.currentUser) return null;
  return await auth.currentUser.getIdToken(forceRefresh);
};
