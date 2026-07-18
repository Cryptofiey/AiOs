import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Silence all firestore logs by default to prevent spamming the console on Quota errors or disconnected networks
setLogLevel('silent');

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
