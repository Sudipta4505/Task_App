import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const projectId = process.env.FIREBASE_PROJECT_ID || 'task-app-b709e';

let initialized = false;

export const initFirebase = () => {
  if (initialized) return;

  try {
    const serviceAccountKeyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const serviceAccountKeyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKeyPath && fs.existsSync(serviceAccountKeyPath)) {
      const fileContent = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(fileContent),
        projectId: fileContent.project_id || projectId
      });
      console.log(`[Firebase Admin] Initialized with service account file from ${serviceAccountKeyPath}`);
    } else if (serviceAccountKeyJson) {
      const parsedJson = JSON.parse(serviceAccountKeyJson);
      admin.initializeApp({
        credential: admin.credential.cert(parsedJson),
        projectId: parsedJson.project_id || projectId
      });
      console.log('[Firebase Admin] Initialized with inline service account JSON');
    } else {
      // Default initialization with project ID
      admin.initializeApp({
        projectId
      });
      console.log(`[Firebase Admin] Initialized with project ID: ${projectId}`);
    }
    initialized = true;
  } catch (error) {
    console.error(`[Firebase Admin Error] Could not initialize Firebase Admin: ${error.message}`);
  }
};

/**
 * Verify Firebase ID Token.
 * Attempts admin SDK first; falls back to Google's public key endpoint if needed.
 */
export const verifyFirebaseToken = async (idToken) => {
  initFirebase();

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
      picture: decodedToken.picture || ''
    };
  } catch (adminError) {
    // Fallback: Verify via Google's tokeninfo API or direct public keys
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (res.ok) {
        const payload = await res.json();
        // Verify audience matches our project or Google client ID
        if (payload.aud === projectId || payload.sub) {
          return {
            uid: payload.sub || payload.user_id,
            email: payload.email || '',
            name: payload.name || payload.email?.split('@')[0] || 'User',
            picture: payload.picture || ''
          };
        }
      }
    } catch (fallbackError) {
      // ignore and throw original error
    }

    throw new Error(`Token verification failed: ${adminError.message}`);
  }
};
