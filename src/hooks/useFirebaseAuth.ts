import { useEffect, useState } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { firebaseAuth, googleProvider } from '../lib/firebase';

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const token = await firebaseUser.getIdTokenResult();
        setIsAdmin(token.claims['admin'] === true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      setLoading(true);
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (authError) {
      setError((authError as Error).message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setError(null);
    try {
      setLoading(true);
      await signOut(firebaseAuth);
      setUser(null);
    } catch (signOutError) {
      setError((signOutError as Error).message || 'Sign-out failed.');
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isAdmin,
    loading,
    error,
    signInWithGoogle,
    signOutUser,
  };
}
