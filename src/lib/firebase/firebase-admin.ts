import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../../firebase-applet-config.json' assert { type: 'json' };

if (!getApps().length) {
  initializeApp();
}

export const adminAuth = getAuth();
