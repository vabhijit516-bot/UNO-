import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAoQpbNN6IlZU_DCyUjWm55kMVd_4BTGtU",
  authDomain: "uno-game-cc0aa.firebaseapp.com",
  projectId: "uno-game-cc0aa",
  storageBucket: "uno-game-cc0aa.firebasestorage.app",
  messagingSenderId: "99346336346",
  appId: "1:99346336346:web:26e72d8ace8a3efa116663"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = () => signOut(auth);
