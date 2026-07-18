import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';

export type { User };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/tasks');
provider.addScope('https://www.googleapis.com/auth/forms.body');
provider.addScope('https://www.googleapis.com/auth/presentations');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
provider.addScope('https://www.googleapis.com/auth/chat.spaces');
provider.addScope('https://www.googleapis.com/auth/chat.messages');
provider.addScope('https://www.googleapis.com/auth/chat.memberships');
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/keep');
provider.addScope('https://www.googleapis.com/auth/documents');

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedIdToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string, idToken: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        const idToken = await user.getIdToken();
        cachedIdToken = idToken;
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken, idToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string; idToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    const idToken = await result.user.getIdToken();
    cachedIdToken = idToken;
    return { user: result.user, accessToken: cachedAccessToken, idToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getIdToken = async (): Promise<string | null> => {
  if (!auth.currentUser) return null;
  if (!cachedIdToken) {
    cachedIdToken = await auth.currentUser.getIdToken();
  }
  return cachedIdToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  cachedIdToken = null;
};
